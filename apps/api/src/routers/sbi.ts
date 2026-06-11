/**
 * SBI router — per-task children of a PBI. Mirrors 大和心 🟢 SBI.
 *
 * SBIs live as Block rows with type='sbi' and parentId=<pbi block id>.
 * That parent pointer is what gives PBI.progress its rollup (count of
 * SBIs whose status='done' over total non-archived).
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNull, sql, type SQL } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { sbiPropsSchema, sbiStatusSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { allocateHumanId } from '../lib/human-id.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { atomicPropsMerge } from '../lib/props-merge.js';
import { protectedProcedure, router } from '../trpc.js';

/**
 * status 遷移のライフサイクル日付（startedAt / completedAt）を「未設定のとき
 * だけ」押す jsonb 式。判定を UPDATE 文の中で行うので、読んだ時点の古い
 * props に依存しない（lib/props-merge.ts 参照）。
 */
function withStampIfUnset(expr: SQL, key: 'startedAt' | 'completedAt', iso: string): SQL {
  return sql`${expr} || (case when (coalesce(${schema.block.props}, '{}'::jsonb)->${key}::text) is null then ${JSON.stringify({ [key]: iso })}::jsonb else '{}'::jsonb end)`;
}

export const sbiRouter = router({
  listForPbi: protectedProcedure
    .input(z.object({ pbiId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [pbi] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pbiId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!pbi) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, pbi.workspaceId, ctx.session.user.id);

      return ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.parentId, input.pbiId),
            eq(schema.block.type, 'sbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
    }),

  listForWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, input.workspaceId),
            eq(schema.block.type, 'sbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
    }),

  create: protectedProcedure
    .input(
      z.object({
        pbiId: z.string().min(1),
        title: z.string().trim().min(1).max(200),
        estimateHours: z.number().min(0).max(200).optional(),
        assigneeId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [pbi] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pbiId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!pbi) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, pbi.workspaceId, ctx.session.user.id);

      const id = ulid();
      const { number } = await allocateHumanId(ctx.db, pbi.workspaceId, 'sbi');
      const props = sbiPropsSchema.parse({
        title: input.title,
        pbiId: input.pbiId,
        number,
        ...(typeof input.estimateHours === 'number' ? { estimateHours: input.estimateHours } : {}),
        ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
      });

      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: pbi.workspaceId,
          parentId: input.pbiId,
          type: 'sbi',
          position: id,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        sbiId: z.string().min(1),
        patch: sbiPropsSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sbiId),
            eq(schema.block.type, 'sbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      const patch: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(input.patch)) {
        if (value !== undefined) patch[key] = value;
      }
      const now = new Date().toISOString();

      // 検証ゲート：マージ結果がスキーマ違反ならここで弾く（書き込みには使わない）。
      // Auto-stamp transitions for the lifecycle dates 大和心 tracks.
      const merged: Record<string, unknown> = { ...current, ...patch };
      if (input.patch.status === 'in_progress' && !current['startedAt']) merged['startedAt'] = now;
      if (input.patch.status === 'done' && !current['completedAt']) merged['completedAt'] = now;
      sbiPropsSchema.parse(merged);

      // 書き込みは patch キーだけの単一 UPDATE 文の jsonb マージ。全量書き戻しは
      // 並行する update / MCP の書き込みを巻き戻す（lib/props-merge.ts 参照）。
      let propsExpr = atomicPropsMerge({ set: patch });
      if (input.patch.status === 'in_progress') {
        propsExpr = withStampIfUnset(propsExpr, 'startedAt', now);
      }
      if (input.patch.status === 'done') {
        propsExpr = withStampIfUnset(propsExpr, 'completedAt', now);
      }

      const [row] = await ctx.db
        .update(schema.block)
        .set({
          props: propsExpr,
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.sbiId))
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),

  /** Cycle the next status (matches the PBI/Status chip UX). */
  cycleStatus: protectedProcedure
    .input(z.object({ sbiId: z.string().min(1), status: sbiStatusSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sbiId),
            eq(schema.block.type, 'sbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      const now = new Date().toISOString();

      // 検証ゲート（書き込みには使わない）。update と同じ理由で書き込みは
      // status キーだけの原子マージ＋ UPDATE 文内 CASE のスタンプにする。
      const merged: Record<string, unknown> = { ...current, status: input.status };
      if (input.status === 'in_progress' && !current['startedAt']) merged['startedAt'] = now;
      if (input.status === 'done' && !current['completedAt']) merged['completedAt'] = now;
      sbiPropsSchema.parse(merged);

      let propsExpr = atomicPropsMerge({ set: { status: input.status } });
      if (input.status === 'in_progress') propsExpr = withStampIfUnset(propsExpr, 'startedAt', now);
      if (input.status === 'done') propsExpr = withStampIfUnset(propsExpr, 'completedAt', now);

      const [row] = await ctx.db
        .update(schema.block)
        .set({
          props: propsExpr,
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.sbiId))
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),
});
