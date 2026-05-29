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
import { and, eq } from 'drizzle-orm';
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
  type DbColumn,
  type DbProps,
  type DbRowProps,
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
      return {
        id: head.id,
        workspaceId: head.workspaceId,
        props: dbProps,
        rows: rows.map((r) => ({
          id: r.id,
          position: r.position,
          props: readRowProps(r.props),
        })),
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
