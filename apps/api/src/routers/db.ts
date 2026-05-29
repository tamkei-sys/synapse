/**
 * User-defined DB router (PBI-30 MVP).
 *
 * 「DB」は単一の Block (type='db') + その子 (type='db_row')。Notion の
 * Database に相当。MVP は Table ビューのみで、列タイプは text / number /
 * checkbox / select / date。
 *
 * 設計メモ:
 *   - relations は未対応（block_dependency を後で再利用予定）
 *   - 行の position は ulid。並べ替えは別 PBI（dnd-kit を載せる）
 *   - フォーミュラ列は HyperFormula を使って sheet ブロックと統合する案。
 *     これも別 PBI。
 *   - cell 更新は jsonb_set ベース。複数セル一括 update は当面 N+1 で
 *     許容（行数 < 1000 想定）。
 */
import { and, eq, inArray } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import {
  dbColumnSchema,
  dbCellValueSchema,
  dbPropsSchema,
  dbRowPropsSchema,
  defaultDbColumns,
  type DbCellValue,
  type DbColumn,
  type DbProps,
  type DbRowProps,
  type RollupFn,
} from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

function readDbProps(props: unknown): DbProps {
  return dbPropsSchema.parse(props);
}

function readRowProps(props: unknown): DbRowProps {
  return dbRowPropsSchema.parse(props);
}

/** 参照先 DB の行から「タイトル」っぽい表示ラベルを取り出す。 */
function rowLabel(dbProps: DbProps, values: Record<string, DbCellValue>): string {
  const titleCol = dbProps.columns.find((c) => c.kind === 'text') ?? dbProps.columns[0];
  const v = titleCol ? values[titleCol.id] : undefined;
  return typeof v === 'string' && v ? v : '(無題)';
}

/** rollup の集計。relation 先の対象列の値配列 + リンク数を受けて結果を返す。 */
function aggregateRollup(
  fn: RollupFn,
  targetVals: DbCellValue[],
  linkedCount: number,
): number | string | null {
  if (fn === 'count') return linkedCount;
  if (fn === 'show') {
    const labels = targetVals
      .filter((v) => v !== null && v !== undefined && v !== '')
      .map((v) => (Array.isArray(v) ? v.join(', ') : String(v)));
    return labels.length ? labels.join(', ') : null;
  }
  const nums = targetVals
    .map((v) => (typeof v === 'number' ? v : Number(v)))
    .filter((n) => Number.isFinite(n));
  if (nums.length === 0) return fn === 'sum' ? 0 : null;
  switch (fn) {
    case 'sum':
      return nums.reduce((a, b) => a + b, 0);
    case 'avg':
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case 'min':
      return Math.min(...nums);
    case 'max':
      return Math.max(...nums);
    default:
      return null;
  }
}

export const dbRouter = router({
  /** 新しい DB を作る。columns 未指定なら defaultDbColumns()。 */
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        title: z.string().trim().min(1).max(200).default('無題のデータベース'),
        columns: z.array(dbColumnSchema).max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const props: DbProps = dbPropsSchema.parse({
        title: input.title,
        columns: input.columns?.length ? input.columns : defaultDbColumns(),
      });
      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'db',
          position: id,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),

  /** DB ヘッダ + 行を取得。 */
  get: protectedProcedure
    .input(z.object({ dbId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const head = (
        await ctx.db.select().from(schema.block).where(eq(schema.block.id, input.dbId)).limit(1)
      )[0];
      if (!head || head.type !== 'db') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, head.workspaceId, ctx.session.user.id);
      const dbProps = readDbProps(head.props);
      const rows = await ctx.db
        .select()
        .from(schema.block)
        .where(and(eq(schema.block.parentId, head.id), eq(schema.block.type, 'db_row')))
        .orderBy(schema.block.position);
      const mappedRows = rows.map((r) => ({
        id: r.id,
        position: r.position,
        props: readRowProps(r.props),
      }));

      // ── relation 解決 + rollup 集計 (PBI-63 / PBI-64) ──────────────
      const relationCols = dbProps.columns.filter(
        (c) => c.kind === 'relation' && c.relationDbId,
      );
      const rollupCols = dbProps.columns.filter((c) => c.kind === 'rollup');

      const targetDbIds = new Set<string>();
      for (const c of relationCols) if (c.relationDbId) targetDbIds.add(c.relationDbId);

      type TargetRow = { id: string; values: Record<string, DbCellValue> };
      const targetRowsByDb = new Map<string, TargetRow[]>();
      const targetRowById = new Map<string, TargetRow>();
      const targetHeadById = new Map<string, DbProps>();

      if (targetDbIds.size > 0) {
        const heads = await ctx.db
          .select()
          .from(schema.block)
          .where(and(inArray(schema.block.id, [...targetDbIds]), eq(schema.block.type, 'db')));
        for (const h of heads) {
          // 別 workspace の DB は参照しない（テナント越え防止）。
          if (h.workspaceId !== head.workspaceId) continue;
          targetHeadById.set(h.id, readDbProps(h.props));
        }
        const validIds = [...targetHeadById.keys()];
        if (validIds.length > 0) {
          const trows = await ctx.db
            .select()
            .from(schema.block)
            .where(
              and(inArray(schema.block.parentId, validIds), eq(schema.block.type, 'db_row')),
            )
            .orderBy(schema.block.position);
          for (const r of trows) {
            const rp = readRowProps(r.props);
            const tr: TargetRow = { id: r.id, values: rp.values };
            targetRowById.set(r.id, tr);
            const list = targetRowsByDb.get(rp.dbId) ?? [];
            list.push(tr);
            targetRowsByDb.set(rp.dbId, list);
          }
        }
      }

      // 列 id → {targetDbId, options}（チップ表示 + ピッカー用）。
      const relations: Record<
        string,
        { targetDbId: string; options: { id: string; label: string }[] }
      > = {};
      for (const c of relationCols) {
        const tdb = c.relationDbId;
        if (!tdb) continue;
        const tProps = targetHeadById.get(tdb);
        const options = (targetRowsByDb.get(tdb) ?? []).map((tr) => ({
          id: tr.id,
          label: tProps ? rowLabel(tProps, tr.values) : '(無題)',
        }));
        relations[c.id] = { targetDbId: tdb, options };
      }

      // 行 id → 列 id → 集計値（rollup は派生なので保存しない）。
      const rollups: Record<string, Record<string, number | string | null>> = {};
      if (rollupCols.length > 0) {
        for (const r of mappedRows) {
          const perRow: Record<string, number | string | null> = {};
          for (const rc of rollupCols) {
            const relCol = dbProps.columns.find(
              (c) => c.id === rc.rollupRelationColumnId && c.kind === 'relation',
            );
            if (!relCol || !rc.rollupTargetColumnId || !rc.rollupFn) {
              perRow[rc.id] = null;
              continue;
            }
            const linked = r.props.values[relCol.id];
            const ids = Array.isArray(linked) ? linked : [];
            const targetColId = rc.rollupTargetColumnId;
            const targetVals = ids
              .map((id) => targetRowById.get(id)?.values[targetColId])
              .filter((v): v is DbCellValue => v !== undefined);
            perRow[rc.id] = aggregateRollup(rc.rollupFn, targetVals, ids.length);
          }
          rollups[r.id] = perRow;
        }
      }

      return {
        id: head.id,
        workspaceId: head.workspaceId,
        props: dbProps,
        rows: mappedRows,
        relations,
        rollups,
      };
    }),

  /** 列を末尾に 1 つ追加。 */
  addColumn: protectedProcedure
    .input(
      z.object({
        dbId: z.string().min(1),
        column: dbColumnSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const head = (
        await ctx.db.select().from(schema.block).where(eq(schema.block.id, input.dbId)).limit(1)
      )[0];
      if (!head || head.type !== 'db') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, head.workspaceId, ctx.session.user.id);
      const props = readDbProps(head.props);
      if (props.columns.some((c) => c.id === input.column.id)) {
        throw new TRPCError({ code: 'CONFLICT', message: 'duplicate column id' });
      }
      const next: DbProps = { ...props, columns: [...props.columns, input.column] };
      await ctx.db
        .update(schema.block)
        .set({ props: next, updatedAt: new Date() })
        .where(eq(schema.block.id, input.dbId));
      return { ok: true };
    }),

  /** 行を 1 つ末尾追加。 */
  addRow: protectedProcedure
    .input(
      z.object({
        dbId: z.string().min(1),
        values: z.record(z.string().min(1), dbCellValueSchema).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const head = (
        await ctx.db.select().from(schema.block).where(eq(schema.block.id, input.dbId)).limit(1)
      )[0];
      if (!head || head.type !== 'db') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, head.workspaceId, ctx.session.user.id);
      const rowId = ulid();
      const props: DbRowProps = dbRowPropsSchema.parse({
        dbId: head.id,
        values: input.values ?? {},
      });
      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id: rowId,
          workspaceId: head.workspaceId,
          parentId: head.id,
          type: 'db_row',
          position: rowId,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return { id: row.id, position: row.position, props };
    }),

  /** 1 セル更新。値が null なら未入力扱いでキー削除。 */
  updateCell: protectedProcedure
    .input(
      z.object({
        rowId: z.string().min(1),
        columnId: z.string().min(1),
        value: dbCellValueSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const r = (
        await ctx.db.select().from(schema.block).where(eq(schema.block.id, input.rowId)).limit(1)
      )[0];
      if (!r || r.type !== 'db_row') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, r.workspaceId, ctx.session.user.id);
      const props = readRowProps(r.props);
      const nextValues = { ...props.values };
      if (input.value === null) {
        delete nextValues[input.columnId];
      } else {
        nextValues[input.columnId] = input.value;
      }
      const next: DbRowProps = { ...props, values: nextValues };
      await ctx.db
        .update(schema.block)
        .set({ props: next, updatedAt: new Date() })
        .where(eq(schema.block.id, input.rowId));
      return { ok: true };
    }),

  /** 行を削除。 */
  deleteRow: protectedProcedure
    .input(z.object({ rowId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const r = (
        await ctx.db.select().from(schema.block).where(eq(schema.block.id, input.rowId)).limit(1)
      )[0];
      if (!r || r.type !== 'db_row') throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, r.workspaceId, ctx.session.user.id);
      // soft delete はやらず、行は完全に消す（DB の中身は揮発的に扱う）。
      await ctx.db.delete(schema.block).where(eq(schema.block.id, input.rowId));
      return { ok: true };
    }),

  /** ワークスペース内の DB 一覧（Sidebar や検索用）。 */
  listForWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const rows = await ctx.db
        .select({
          id: schema.block.id,
          props: schema.block.props,
          createdAt: schema.block.createdAt,
        })
        .from(schema.block)
        .where(
          and(eq(schema.block.workspaceId, input.workspaceId), eq(schema.block.type, 'db')),
        )
        .orderBy(sql`${schema.block.createdAt} desc`)
        .limit(50);
      return rows.map((r) => ({
        id: r.id,
        title: (r.props as { title?: string })?.title ?? '無題のデータベース',
        createdAt: r.createdAt,
      }));
    }),
});

// helper export for downstream (currently unused but keeps shape stable)
export type DbColumnInput = DbColumn;
