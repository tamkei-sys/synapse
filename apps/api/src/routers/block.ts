/**
 * Block CRUD — page lifecycle.
 *
 * In S2 the canonical content of a page lives in `page.props.doc` as a
 * TipTap / ProseMirror JSON document. Child block rows (paragraph,
 * heading, …) are deliberately not fanned out yet — that's a S3+
 * projection so search / backlinks have something to index. For now the
 * editor is the source of truth.
 *
 * `position` is the ULID so blocks are lexically ordered by creation
 * time; fractional indexing can slot in later without a schema change.
 */
import { TRPCError } from '@trpc/server';
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { pageMetaPatchSchema, sheetCellsSchema, sheetPropsSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';
import type { Env } from '../env.js';
import { indexBlock } from '../integrations/typesense/client.js';
import { projectBlock } from '../integrations/typesense/extract.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { EMPTY_DOC, extractTextPreview } from '../lib/page-doc.js';
import { purgeOldTrash } from '../lib/purge-trash.js';
import { generateShareToken, sanitizePublicDoc } from '../lib/public-doc.js';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';

type IndexableBlock = {
  id: string;
  workspaceId: string;
  type: string;
  props: unknown;
  updatedAt: Date;
};

/**
 * Project + push to Typesense. Awaited in S8 because workerd may cancel
 * post-response promises without a waitUntil binding; in prod we'll
 * move to Cloudflare Queues + waitUntil so the response stays <100ms.
 * Failures only warn.
 */
async function indexAfterWrite(env: Env, row: IndexableBlock): Promise<void> {
  const doc = projectBlock(row);
  if (!doc) return;
  try {
    await indexBlock(env, doc);
  } catch (err) {
    console.warn('[search] indexBlock failed:', err);
  }
}

/**
 * Yjs バイナリ state を別の block id へ複製する (PBI-55 テンプレート)。
 *
 * `block_yjs_state.state` は内容エンコードで document name (block id) に
 * 依存しない純粋な CRDT バイナリなので、行をそのまま新しい block id へ
 * 挿し直せばテンプレート本文が「編集可能な状態で」復元される。元ページが
 * 一度も編集されていない (state 行が無い) ときは何もしない — props.doc が
 * 空のまま空ページになるだけで正しい。
 */
async function copyYjsState(db: Database, fromId: string, toId: string): Promise<void> {
  const [row] = await db
    .select({ state: schema.blockYjsState.state })
    .from(schema.blockYjsState)
    .where(eq(schema.blockYjsState.blockId, fromId))
    .limit(1);
  if (!row) return;
  await db
    .insert(schema.blockYjsState)
    .values({ blockId: toId, state: row.state, updatedAt: new Date() })
    .onConflictDoNothing();
}

/**
 * 「テンプレートは通常のページ一覧/検索/バックリンクに出さない」ための
 * 述語。props.isTemplate が真でない page だけを通す。jsonb の boolean は
 * `->>` でテキスト 'true' になるので文字列比較で判定する。毎回新しい
 * sql 片を返して使い回しの副作用を避ける。
 */
const notTemplate = () =>
  sql`coalesce(${schema.block.props}->>'isTemplate', 'false') <> 'true'`;

const workspaceIdInput = z.object({ workspaceId: z.string().min(1) });

export const blockRouter = router({
  /**
   * Fetch any non-deleted block by id, regardless of `type`.
   *
   * Powers the unified `/b/$blockId` detail route — pages, sheets,
   * projects, sprints, PBIs and SBIs all flow through this single
   * read. The caller decides how to render based on `row.type`.
   */
  getAny: protectedProcedure
    .input(z.object({ blockId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.block)
        .where(and(eq(schema.block.id, input.blockId), isNull(schema.block.deletedAt)))
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, row.workspaceId, ctx.session.user.id);
      return row;
    }),

  /** Top-level page blocks in the workspace. */
  /**
   * トップレベルのページ一覧（parentId IS NULL）。
   * Sidebar / search で使う。
   */
  listPages: protectedProcedure.input(workspaceIdInput).query(async ({ ctx, input }) => {
    await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);

    return ctx.db
      .select()
      .from(schema.block)
      .where(
        and(
          eq(schema.block.workspaceId, input.workspaceId),
          eq(schema.block.type, 'page'),
          isNull(schema.block.parentId),
          isNull(schema.block.deletedAt),
          notTemplate(),
        ),
      )
      .orderBy(asc(schema.block.position));
  }),

  /**
   * 全ページ一覧 (parent 含む) — Sidebar の tree を組み立てる用。
   * Notion 風サブページ機能 (PBI-34) で追加。
   */
  listAllPages: protectedProcedure.input(workspaceIdInput).query(async ({ ctx, input }) => {
    await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
    return ctx.db
      .select({
        id: schema.block.id,
        parentId: schema.block.parentId,
        position: schema.block.position,
        props: schema.block.props,
      })
      .from(schema.block)
      .where(
        and(
          eq(schema.block.workspaceId, input.workspaceId),
          eq(schema.block.type, 'page'),
          isNull(schema.block.deletedAt),
          notTemplate(),
        ),
      )
      .orderBy(asc(schema.block.position));
  }),

  /**
   * タイトル部分一致でページを検索（@page autocomplete 用, PBI-69）。
   * Typesense ではなく軽量に props->>'title' の ILIKE で十分（候補 8 件）。
   */
  searchPages: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1), query: z.string().max(100) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const rows = await ctx.db
        .select({ id: schema.block.id, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, input.workspaceId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
            notTemplate(),
            input.query.trim()
              ? sql`${schema.block.props}->>'title' ILIKE ${'%' + input.query.trim() + '%'}`
              : sql`true`,
          ),
        )
        .orderBy(asc(schema.block.position))
        .limit(8);
      return rows.map((r) => ({
        id: r.id,
        title: (r.props as { title?: string } | null)?.title ?? '無題',
        icon: (r.props as { icon?: string } | null)?.icon ?? null,
      }));
    }),

  /** あるページの直下子ページのみ。詳細画面で表示する用。 */
  listChildPages: protectedProcedure
    .input(z.object({ parentPageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const parent = (
        await ctx.db
          .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
          .from(schema.block)
          .where(eq(schema.block.id, input.parentPageId))
          .limit(1)
      )[0];
      if (!parent || parent.type !== 'page') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, parent.workspaceId, ctx.session.user.id);
      return ctx.db
        .select({
          id: schema.block.id,
          props: schema.block.props,
          position: schema.block.position,
        })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.parentId, input.parentPageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
    }),

  /**
   * ルートまで遡るパンくず。/p/$pageId で「親 / さらに親 / 自分」を出すのに使う。
   * 安全策で最大 16 段まで。循環 (本来不可能) で無限ループしないように。
   */
  getPageBreadcrumb: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const trail: { id: string; title: string }[] = [];
      let current = input.pageId;
      let workspaceId: string | null = null;
      for (let i = 0; i < 16; i++) {
        const row = (
          await ctx.db
            .select({
              id: schema.block.id,
              parentId: schema.block.parentId,
              props: schema.block.props,
              type: schema.block.type,
              workspaceId: schema.block.workspaceId,
            })
            .from(schema.block)
            .where(eq(schema.block.id, current))
            .limit(1)
        )[0];
        if (!row || row.type !== 'page') break;
        workspaceId ??= row.workspaceId;
        const title = (row.props as { title?: string } | null)?.title ?? '無題';
        trail.unshift({ id: row.id, title });
        if (!row.parentId) break;
        current = row.parentId;
      }
      if (!workspaceId) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, workspaceId, ctx.session.user.id);
      return trail;
    }),

  /**
   * このページを参照しているページ一覧 = バックリンク (PBI-73)。
   * page_link を target_id で逆引きし、source ページ（非削除）を返す。
   */
  listBacklinks: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const target = (
        await ctx.db
          .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
          .from(schema.block)
          .where(and(eq(schema.block.id, input.pageId), isNull(schema.block.deletedAt)))
          .limit(1)
      )[0];
      if (!target || target.type !== 'page') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, target.workspaceId, ctx.session.user.id);
      const rows = await ctx.db
        .select({ id: schema.block.id, props: schema.block.props })
        .from(schema.pageLink)
        .innerJoin(schema.block, eq(schema.block.id, schema.pageLink.sourceId))
        .where(
          and(
            eq(schema.pageLink.targetId, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
            notTemplate(),
          ),
        )
        .orderBy(asc(schema.block.position))
        .limit(100);
      return rows.map((r) => ({
        id: r.id,
        title: (r.props as { title?: string } | null)?.title ?? '無題',
        icon: (r.props as { icon?: string } | null)?.icon ?? null,
      }));
    }),

  /** Fetch a page block. */
  getPage: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

      await assertWorkspaceMember(ctx.db, page.workspaceId, ctx.session.user.id);
      return { page };
    }),

  /**
   * Create a new page seeded with an empty TipTap doc.
   *
   * `parentPageId` を渡すとサブページとして作成（PBI-34）。Notion 風に
   * ドキュメントの中から派生ドキュメントを生やす導線で使う。親が
   * 同一 workspace の page 型でないと FORBIDDEN にする。
   */
  createPage: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        title: z.string().trim().min(1).max(200).default('Untitled'),
        parentPageId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);

      // 親ページがあるなら同一 WS + page 型を確認。
      if (input.parentPageId) {
        const parent = (
          await ctx.db
            .select({
              workspaceId: schema.block.workspaceId,
              type: schema.block.type,
            })
            .from(schema.block)
            .where(eq(schema.block.id, input.parentPageId))
            .limit(1)
        )[0];
        if (!parent || parent.type !== 'page') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'parent page not found' });
        }
        if (parent.workspaceId !== input.workspaceId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'cross-workspace parent forbidden' });
        }
      }

      const pageId = ulid();
      const [page] = await ctx.db
        .insert(schema.block)
        .values({
          id: pageId,
          workspaceId: input.workspaceId,
          parentId: input.parentPageId ?? null,
          type: 'page',
          position: pageId,
          props: { title: input.title, doc: EMPTY_DOC },
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!page) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await indexAfterWrite(ctx.env, page);
      return page;
    }),

  /**
   * 現在のページをテンプレートとして保存 (PBI-55)。
   *
   * 元ページのコピーを `props.isTemplate=true` で作る。本文 (Yjs state) も
   * 複製するのでテンプレ自体を普通のエディタで編集できる。テンプレは
   * listAllPages / listPages / searchPages / listBacklinks から除外される
   * ので通常のページツリー・検索・バックリンクには出ない。検索インデックス
   * にも載せない (indexAfterWrite を呼ばない)。
   */
  saveAsTemplate: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [src] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!src) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, src.workspaceId, ctx.session.user.id);

      const srcProps = (src.props ?? {}) as Record<string, unknown>;
      const newId = ulid();
      const [tpl] = await ctx.db
        .insert(schema.block)
        .values({
          id: newId,
          workspaceId: src.workspaceId,
          parentId: null,
          type: 'page',
          position: newId,
          props: { ...srcProps, isTemplate: true },
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!tpl) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      // 本文 (Yjs バイナリ) を複製。元が未編集なら state 行が無く no-op。
      await copyYjsState(ctx.db, input.pageId, newId);
      return tpl;
    }),

  /** ワークスペースのテンプレート一覧 (PBI-55)。props.isTemplate=true の page。 */
  listTemplates: protectedProcedure.input(workspaceIdInput).query(async ({ ctx, input }) => {
    await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
    const rows = await ctx.db
      .select({ id: schema.block.id, props: schema.block.props })
      .from(schema.block)
      .where(
        and(
          eq(schema.block.workspaceId, input.workspaceId),
          eq(schema.block.type, 'page'),
          isNull(schema.block.deletedAt),
          sql`${schema.block.props}->>'isTemplate' = 'true'`,
        ),
      )
      .orderBy(asc(schema.block.position));
    return rows.map((r) => ({
      id: r.id,
      title: (r.props as { title?: string } | null)?.title ?? '無題',
      icon: (r.props as { icon?: string } | null)?.icon ?? null,
    }));
  }),

  /**
   * テンプレートから通常ページを作成 (PBI-55)。
   *
   * テンプレの props (doc スナップショット含む) を複製し isTemplate を外す。
   * 本文 (Yjs state) も複製するので、新ページを開くとテンプレ内容が編集
   * 可能な状態で表示される。`parentPageId` を渡すとサブページとして作る
   * (createPage と同じく同一 WS + page 型を検証)。新ページは検索に載せる。
   */
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string().min(1),
        parentPageId: z.string().min(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [tpl] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.templateId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!tpl) throw new TRPCError({ code: 'NOT_FOUND' });
      const tplProps = (tpl.props ?? {}) as Record<string, unknown>;
      if (tplProps['isTemplate'] !== true) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'not a template' });
      }
      await assertCanWrite(ctx.db, tpl.workspaceId, ctx.session.user.id);

      // 親ページがあるなら同一 WS + page 型を確認 (createPage と同じ規則)。
      if (input.parentPageId) {
        const parent = (
          await ctx.db
            .select({
              workspaceId: schema.block.workspaceId,
              type: schema.block.type,
            })
            .from(schema.block)
            .where(eq(schema.block.id, input.parentPageId))
            .limit(1)
        )[0];
        if (!parent || parent.type !== 'page') {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'parent page not found' });
        }
        if (parent.workspaceId !== tpl.workspaceId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'cross-workspace parent forbidden' });
        }
      }

      const newId = ulid();
      // isTemplate を外して通常ページに。title / doc / icon / cover は引き継ぐ。
      const props = { ...tplProps };
      delete props['isTemplate'];
      const [page] = await ctx.db
        .insert(schema.block)
        .values({
          id: newId,
          workspaceId: tpl.workspaceId,
          parentId: input.parentPageId ?? null,
          type: 'page',
          position: newId,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!page) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      // 本文 (Yjs バイナリ) を複製してから検索インデックスへ。
      await copyYjsState(ctx.db, input.templateId, newId);
      await indexAfterWrite(ctx.env, page);
      return page;
    }),

  /**
   * ページの親付け替え + 兄弟内の並べ替え (PBI-72)。
   *
   * Sidebar のツリー DnD から呼ぶ。`newParentId` に移動先の親（ルート直下なら
   * null）、`orderedSiblingIds` に移動後の同階層の並び（pageId を含む）を渡す。
   * position は 6 桁ゼロ詰めで振り直す（行並べ替え PBI-71 と同方式）。
   *
   * 循環防止: 自分自身、または自分の子孫を新しい親にはできない。
   */
  movePage: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        newParentId: z.string().min(1).nullable(),
        orderedSiblingIds: z.array(z.string().min(1)).min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const page = (
        await ctx.db
          .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
          .from(schema.block)
          .where(eq(schema.block.id, input.pageId))
          .limit(1)
      )[0];
      if (!page || page.type !== 'page') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, page.workspaceId, ctx.session.user.id);

      if (input.newParentId) {
        if (input.newParentId === input.pageId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'cannot parent a page to itself' });
        }
        // 移動先の親が同一 WS の page かを確認 + 祖先を遡って循環を検出。
        let cursor: string | null = input.newParentId;
        let guard = 0;
        while (cursor && guard < 64) {
          const currentId: string = cursor;
          const node:
            | { parentId: string | null; workspaceId: string; type: string }
            | undefined = (
            await ctx.db
              .select({
                parentId: schema.block.parentId,
                workspaceId: schema.block.workspaceId,
                type: schema.block.type,
              })
              .from(schema.block)
              .where(eq(schema.block.id, currentId))
              .limit(1)
          )[0];
          if (!node || node.type !== 'page') {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'new parent not found' });
          }
          if (node.workspaceId !== page.workspaceId) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'cross-workspace move forbidden' });
          }
          // 祖先のどこかに自分が現れる = newParentId が自分の子孫 → 循環。
          if (node.parentId === input.pageId) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'cannot move into a descendant' });
          }
          cursor = node.parentId;
          guard += 1;
        }
      }

      // 親を付け替え。
      await ctx.db
        .update(schema.block)
        .set({ parentId: input.newParentId, updatedAt: new Date() })
        .where(eq(schema.block.id, input.pageId));

      // 同一 workspace の page だけを対象に position を振り直す。
      const owned = await ctx.db
        .select({ id: schema.block.id })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, page.workspaceId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        );
      const valid = new Set(owned.map((r) => r.id));
      let i = 0;
      for (const sibId of input.orderedSiblingIds) {
        if (!valid.has(sibId)) continue;
        await ctx.db
          .update(schema.block)
          .set({ position: String(i).padStart(6, '0'), updatedAt: new Date() })
          .where(eq(schema.block.id, sibId));
        i += 1;
      }
      return { ok: true };
    }),

  /**
   * ページをゴミ箱へ (PBI-57)。soft-delete。自分 + 子孫ページに
   * deletedAt を立てる。サブツリーごと一覧から消えるようにするため。
   */
  deletePage: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const page = (
        await ctx.db
          .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
          .from(schema.block)
          .where(and(eq(schema.block.id, input.pageId), isNull(schema.block.deletedAt)))
          .limit(1)
      )[0];
      if (!page || page.type !== 'page') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, page.workspaceId, ctx.session.user.id);

      // 子孫ページを BFS で収集（最大 64 段の安全弁）。
      const ids = [input.pageId];
      let frontier = [input.pageId];
      for (let depth = 0; depth < 64 && frontier.length > 0; depth++) {
        const children = await ctx.db
          .select({ id: schema.block.id })
          .from(schema.block)
          .where(
            and(
              inArray(schema.block.parentId, frontier),
              eq(schema.block.type, 'page'),
              isNull(schema.block.deletedAt),
            ),
          );
        frontier = children.map((c) => c.id);
        ids.push(...frontier);
      }
      await ctx.db
        .update(schema.block)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(inArray(schema.block.id, ids));
      return { ok: true, count: ids.length };
    }),

  /** ゴミ箱のページ一覧 (PBI-57)。deletedAt が立っている page。 */
  listTrash: protectedProcedure.input(workspaceIdInput).query(async ({ ctx, input }) => {
    await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
    const rows = await ctx.db
      .select({
        id: schema.block.id,
        props: schema.block.props,
        deletedAt: schema.block.deletedAt,
      })
      .from(schema.block)
      .where(
        and(
          eq(schema.block.workspaceId, input.workspaceId),
          eq(schema.block.type, 'page'),
          isNotNull(schema.block.deletedAt),
        ),
      )
      .orderBy(sql`${schema.block.deletedAt} desc`)
      .limit(200);
    return rows.map((r) => ({
      id: r.id,
      title: (r.props as { title?: string } | null)?.title ?? '無題',
      icon: (r.props as { icon?: string } | null)?.icon ?? null,
      deletedAt: r.deletedAt,
    }));
  }),

  /**
   * 古いゴミ箱を今すぐパージする (PBI-90)。本番は Cron Trigger が全 WS を
   * 自動実行するが、dev には cron が無いので手動 / E2E 用に公開する。
   */
  purgeOldTrash: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1), retentionDays: z.number().int().min(0).optional() }))
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const purged = await purgeOldTrash(ctx.db, {
        workspaceId: input.workspaceId,
        ...(input.retentionDays !== undefined ? { retentionDays: input.retentionDays } : {}),
      });
      return { purged };
    }),

  /**
   * ゴミ箱から復元 (PBI-57)。自分 + 子孫ページの deletedAt を外す。
   * 親が削除済みのままなら、宙に浮かないようルート直下へ戻す。
   */
  restorePage: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const page = (
        await ctx.db
          .select({
            workspaceId: schema.block.workspaceId,
            type: schema.block.type,
            parentId: schema.block.parentId,
          })
          .from(schema.block)
          .where(and(eq(schema.block.id, input.pageId), isNotNull(schema.block.deletedAt)))
          .limit(1)
      )[0];
      if (!page || page.type !== 'page') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, page.workspaceId, ctx.session.user.id);

      const ids = [input.pageId];
      let frontier = [input.pageId];
      for (let depth = 0; depth < 64 && frontier.length > 0; depth++) {
        const children = await ctx.db
          .select({ id: schema.block.id })
          .from(schema.block)
          .where(
            and(
              inArray(schema.block.parentId, frontier),
              eq(schema.block.type, 'page'),
              isNotNull(schema.block.deletedAt),
            ),
          );
        frontier = children.map((c) => c.id);
        ids.push(...frontier);
      }

      // 親が削除済み（= 一緒に復元されない）なら detach。
      let detach = false;
      if (page.parentId) {
        const parent = (
          await ctx.db
            .select({ deletedAt: schema.block.deletedAt })
            .from(schema.block)
            .where(eq(schema.block.id, page.parentId))
            .limit(1)
        )[0];
        if (!parent || parent.deletedAt !== null) detach = true;
      }
      await ctx.db
        .update(schema.block)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(inArray(schema.block.id, ids));
      if (detach) {
        await ctx.db
          .update(schema.block)
          .set({ parentId: null, updatedAt: new Date() })
          .where(eq(schema.block.id, input.pageId));
      }
      return { ok: true, count: ids.length };
    }),

  /**
   * ゴミ箱から完全に削除 (PBI-57)。物理削除。**取り返しがつかない**ので
   * 既に soft-delete 済み（ゴミ箱内）のページだけを対象にする。自分 + 子孫を
   * block テーブルから消す。UI 側で確認フローを必須とする。
   */
  purgePage: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const page = (
        await ctx.db
          .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
          .from(schema.block)
          .where(and(eq(schema.block.id, input.pageId), isNotNull(schema.block.deletedAt)))
          .limit(1)
      )[0];
      // ゴミ箱に無いページは purge 不可（誤爆防止）。
      if (!page || page.type !== 'page') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, page.workspaceId, ctx.session.user.id);

      const ids = [input.pageId];
      let frontier = [input.pageId];
      for (let depth = 0; depth < 64 && frontier.length > 0; depth++) {
        const children = await ctx.db
          .select({ id: schema.block.id })
          .from(schema.block)
          .where(and(inArray(schema.block.parentId, frontier), eq(schema.block.type, 'page')));
        frontier = children.map((c) => c.id);
        ids.push(...frontier);
      }
      await ctx.db.delete(schema.block).where(inArray(schema.block.id, ids));
      return { ok: true, count: ids.length };
    }),

  /** Create a new sheet block (top-level, embeddable). */
  createSheet: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        rows: z.number().int().min(1).max(500).optional(),
        cols: z.number().int().min(1).max(26).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const props = sheetPropsSchema.parse({
        ...(input.rows !== undefined ? { rows: input.rows } : {}),
        ...(input.cols !== undefined ? { cols: input.cols } : {}),
        cells: {},
      });
      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'sheet',
          position: id,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await indexAfterWrite(ctx.env, row);
      return row;
    }),

  /** Fetch a sheet block by id (workspace-scoped). */
  getSheet: protectedProcedure
    .input(z.object({ sheetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sheetId),
            eq(schema.block.type, 'sheet'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, row.workspaceId, ctx.session.user.id);
      return row;
    }),

  /**
   * Replace the cell map (last-write-wins for S7).
   *
   * Server still re-validates with Zod so feature code on read can
   * trust the shape — the client is not the trust boundary.
   */
  updateSheetCells: protectedProcedure
    .input(z.object({ sheetId: z.string().min(1), cells: sheetCellsSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sheetId),
            eq(schema.block.type, 'sheet'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      const validated = sheetPropsSchema.parse({ ...current, cells: input.cells });
      const [updated] = await ctx.db
        .update(schema.block)
        .set({
          props: validated,
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.sheetId))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await indexAfterWrite(ctx.env, updated);
      return updated;
    }),

  /**
   * Persist the page title.
   *
   * Body content is owned by Yjs / Hocuspocus (see apps/sync); the title
   * stays in `block.props.title` so the workspace's page list can render
   * it without spinning up a CRDT connection.
   */
  updatePageTitle: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        title: z.string().trim().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({
          workspaceId: schema.block.workspaceId,
          props: schema.block.props,
        })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const currentProps = (existing.props ?? {}) as Record<string, unknown>;
      const [updated] = await ctx.db
        .update(schema.block)
        .set({
          props: { ...currentProps, title: input.title },
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.pageId))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await indexAfterWrite(ctx.env, updated);
      return updated;
    }),

  /**
   * ドキュメント・メタ（ステータス/種別/レビュアー/タグ/AI要点）を更新 (PBI-107)。
   * doc / title には触れず、指定フィールドだけ props にマージする。`null` で
   * フィールドをクリア、`undefined` で据え置き。
   */
  updatePageMeta: protectedProcedure
    .input(z.object({ pageId: z.string().min(1), patch: pageMetaPatchSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const next = { ...((existing.props ?? {}) as Record<string, unknown>) };
      const p = input.patch;
      for (const key of ['docStatus', 'docType', 'reviewerIds', 'tags', 'aiSummary'] as const) {
        const v = p[key];
        if (v === undefined) continue;
        if (v === null) delete next[key];
        else next[key] = v;
      }

      const [updated] = await ctx.db
        .update(schema.block)
        .set({ props: next, version: sql`${schema.block.version} + 1`, updatedAt: new Date() })
        .where(eq(schema.block.id, input.pageId))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      await indexAfterWrite(ctx.env, updated);
      return updated;
    }),

  /**
   * ページの絵文字アイコンを設定 (PBI-51)。空文字でアイコン解除。
   * props.icon に保存する。
   */
  setPageIcon: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        icon: z.string().max(16), // 絵文字 1 個（サロゲートペア考慮で 16 まで許容）
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const currentProps = (existing.props ?? {}) as Record<string, unknown>;
      const nextProps = { ...currentProps };
      if (input.icon) nextProps['icon'] = input.icon;
      else delete nextProps['icon'];
      await ctx.db
        .update(schema.block)
        .set({ props: nextProps, updatedAt: new Date() })
        .where(eq(schema.block.id, input.pageId));
      return { ok: true };
    }),

  /**
   * ページのカバー画像 URL を設定 (PBI-52)。空文字で解除。
   * dev は data-URL、本番は R2 公開 URL を保存する想定。
   * data-URL は肥大化しうるので 3MB 上限。
   */
  setPageCover: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        cover: z.string().max(3_500_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const currentProps = (existing.props ?? {}) as Record<string, unknown>;
      const nextProps = { ...currentProps };
      if (input.cover) nextProps['cover'] = input.cover;
      else delete nextProps['cover'];
      await ctx.db
        .update(schema.block)
        .set({ props: nextProps, updatedAt: new Date() })
        .where(eq(schema.block.id, input.pageId));
      return { ok: true };
    }),

  /**
   * ページを公開して read-only 共有 URL を発行する (PBI-56)。
   *
   * 顧客向け説明資料として、未認証でも閲覧できる /share/<token> を出す。
   * トークンは初回に生成し以後は再利用する（無効化→再有効化で URL が変わらない）。
   * 実際の閲覧は getPublicPage が doc をサニタイズして返す。
   */
  enablePublicShare: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const props = (existing.props ?? {}) as Record<string, unknown>;
      const share = (props['publicShare'] ?? {}) as { token?: string };
      const token =
        typeof share.token === 'string' && share.token ? share.token : generateShareToken();
      await ctx.db
        .update(schema.block)
        .set({
          props: { ...props, publicShare: { enabled: true, token } },
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.pageId));
      return { enabled: true, token };
    }),

  /** 公開を停止する (PBI-56)。トークンは保持し、再公開で同じ URL に戻れる。 */
  disablePublicShare: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const props = (existing.props ?? {}) as Record<string, unknown>;
      const share = (props['publicShare'] ?? {}) as { token?: string };
      const next = share.token ? { enabled: false, token: share.token } : { enabled: false };
      await ctx.db
        .update(schema.block)
        .set({ props: { ...props, publicShare: next }, updatedAt: new Date() })
        .where(eq(schema.block.id, input.pageId));
      return { ok: true };
    }),

  /** 現在の公開状態 (PBI-56)。UI 表示用に enabled と token を返す。 */
  getPublicShare: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);
      const props = (existing.props ?? {}) as Record<string, unknown>;
      const share = (props['publicShare'] ?? {}) as { enabled?: boolean; token?: string };
      return { enabled: share.enabled === true, token: share.token ?? null };
    }),

  /**
   * 公開ページを取得する (PBI-56) — **publicProcedure（未認証可）**。
   *
   * token で enabled な公開ページだけを引く。返すのは表示に必要な最小限
   * (title / icon / cover / サニタイズ済み doc) のみ。workspaceId や createdBy
   * などの内部情報は一切返さない。doc は sanitizePublicDoc で社内埋め込みと
   * 危険な href/src を除去済み。
   */
  getPublicPage: publicProcedure
    .input(z.object({ token: z.string().min(1).max(128) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
            sql`${schema.block.props}->'publicShare'->>'token' = ${input.token}`,
            sql`${schema.block.props}->'publicShare'->>'enabled' = 'true'`,
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      const props = (row.props ?? {}) as Record<string, unknown>;
      return {
        title: typeof props['title'] === 'string' ? (props['title'] as string) : '無題',
        icon: typeof props['icon'] === 'string' ? (props['icon'] as string) : null,
        cover: typeof props['cover'] === 'string' ? (props['cover'] as string) : null,
        doc: sanitizePublicDoc(props['doc']),
      };
    }),

  // ---- ページ履歴 / バージョン復元 (PBI-54) -------------------------------

  /** 現在の本文を手動スナップショット ('manual' 版) として保存する。 */
  saveVersion: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [page] = await ctx.db
        .select({
          workspaceId: schema.block.workspaceId,
          type: schema.block.type,
          props: schema.block.props,
        })
        .from(schema.block)
        .where(eq(schema.block.id, input.pageId))
        .limit(1);
      if (!page || page.type !== 'page') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, page.workspaceId, userId);
      const doc = (page.props as { doc?: unknown }).doc ?? EMPTY_DOC;
      const id = ulid();
      await ctx.db.insert(schema.pageVersion).values({
        id,
        blockId: input.pageId,
        workspaceId: page.workspaceId,
        doc,
        kind: 'manual',
        createdBy: userId,
      });
      return { id };
    }),

  /** ページの版一覧（新しい順）。各版のプレビューと作成者名を返す。 */
  listVersions: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(eq(schema.block.id, input.pageId))
        .limit(1);
      if (!page) return [];
      await assertWorkspaceMember(ctx.db, page.workspaceId, ctx.session.user.id);
      const rows = await ctx.db
        .select({
          id: schema.pageVersion.id,
          kind: schema.pageVersion.kind,
          createdAt: schema.pageVersion.createdAt,
          authorName: schema.user.name,
          doc: schema.pageVersion.doc,
        })
        .from(schema.pageVersion)
        .leftJoin(schema.user, eq(schema.pageVersion.createdBy, schema.user.id))
        .where(eq(schema.pageVersion.blockId, input.pageId))
        .orderBy(desc(schema.pageVersion.createdAt))
        .limit(100);
      return rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        createdAt: r.createdAt,
        authorName: r.authorName ?? null,
        preview: extractTextPreview(r.doc),
      }));
    }),

  /** 単一版の doc を取得する（復元用。クライアントが setContent で適用する）。 */
  getVersion: protectedProcedure
    .input(z.object({ versionId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [v] = await ctx.db
        .select({ doc: schema.pageVersion.doc, workspaceId: schema.pageVersion.workspaceId })
        .from(schema.pageVersion)
        .where(eq(schema.pageVersion.id, input.versionId))
        .limit(1);
      if (!v) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, v.workspaceId, ctx.session.user.id);
      return { doc: v.doc };
    }),
});
