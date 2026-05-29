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
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { sheetCellsSchema, sheetPropsSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import type { Env } from '../env.js';
import { indexBlock } from '../integrations/typesense/client.js';
import { projectBlock } from '../integrations/typesense/extract.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { EMPTY_DOC } from '../lib/page-doc.js';
import { protectedProcedure, router } from '../trpc.js';

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
        ),
      )
      .orderBy(asc(schema.block.position));
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
});
