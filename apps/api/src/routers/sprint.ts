/**
 * Sprint router — 2-week iteration containers. Mirrors 大和心 Sprint.
 *
 * A Sprint is a Block with type='sprint'. PBIs reference it via
 * `props.sprintId`. SBIs roll up via their parent PBI; no direct edge
 * needed.
 */
import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { SPRINT_LENGTH_DAYS, sprintPropsSchema, sprintStatusSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { allocateHumanId } from '../lib/human-id.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const sprintRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, input.workspaceId),
            eq(schema.block.type, 'sprint'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(desc(schema.block.position));
    }),

  get: protectedProcedure
    .input(z.object({ sprintId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sprintId),
            eq(schema.block.type, 'sprint'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, row.workspaceId, ctx.session.user.id);
      return row;
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        name: z.string().trim().min(1).max(200),
        startDate: z.string().date().optional(),
        endDate: z.string().date().optional(),
        goal: z.string().max(2_000).optional(),
        status: sprintStatusSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const { number, label } = await allocateHumanId(ctx.db, input.workspaceId, 'sprint');

      const now = new Date();
      const defaultStart = input.startDate ?? isoDate(now);
      const defaultEnd =
        input.endDate ?? isoDate(new Date(now.getTime() + SPRINT_LENGTH_DAYS * 86_400_000));

      const props = sprintPropsSchema.parse({
        name: input.name || label,
        startDate: defaultStart,
        endDate: defaultEnd,
        ...(input.goal !== undefined ? { goal: input.goal } : {}),
        ...(input.status ? { status: input.status } : {}),
        number,
      });
      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'sprint',
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
        sprintId: z.string().min(1),
        patch: sprintPropsSchema.innerType().partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sprintId),
            eq(schema.block.type, 'sprint'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      const merged = { ...current, ...input.patch };
      const validated = sprintPropsSchema.parse(merged);

      const [row] = await ctx.db
        .update(schema.block)
        .set({
          props: validated,
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.sprintId))
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),

  /**
   * Burndown / velocity 用の集計。
   *
   * 出力：
   *   startDate / endDate ─ Sprint の期間
   *   totalHours          ─ Sprint 配下 SBI の合計見積時間
   *   totalPbis           ─ Sprint に紐付く PBI 件数
   *   completedPbis       ─ うち status='done' の件数
   *   points              ─ [{ date, remaining, ideal, completedHours }]
   *
   * "1 日分" は startDate を 0 日目とし、endDate に向かって理想線が直線
   * 降下する形にする。状態未到達の未来日は実績 = 直近 remaining が継続
   * （斜めに伸びない平らな線）。
   */
  metrics: protectedProcedure
    .input(z.object({ sprintId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [sprint] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sprintId),
            eq(schema.block.type, 'sprint'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!sprint) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, sprint.workspaceId, ctx.session.user.id);

      const sp = (sprint.props ?? {}) as { startDate?: string; endDate?: string };
      if (!sp.startDate || !sp.endDate) {
        return {
          startDate: sp.startDate ?? null,
          endDate: sp.endDate ?? null,
          totalHours: 0,
          totalPbis: 0,
          completedPbis: 0,
          points: [] as Array<{
            date: string;
            remaining: number;
            ideal: number;
            completedHours: number;
          }>,
        };
      }

      // 該当 sprint の PBI 群
      const allPbis = await ctx.db
        .select({ id: schema.block.id, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, sprint.workspaceId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        );
      const sprintPbis = allPbis.filter(
        (p) => (p.props as { sprintId?: string } | null)?.sprintId === input.sprintId,
      );

      let totalHours = 0;
      const points: Array<{
        date: string;
        remaining: number;
        ideal: number;
        completedHours: number;
      }> = [];

      const startMs = Date.parse(`${sp.startDate}T00:00:00Z`);
      const endMs = Date.parse(`${sp.endDate}T00:00:00Z`);
      const days = Math.max(1, Math.floor((endMs - startMs) / 86_400_000) + 1);

      if (sprintPbis.length === 0) {
        for (let i = 0; i < days; i++) {
          const date = new Date(startMs + i * 86_400_000).toISOString().slice(0, 10);
          points.push({ date, remaining: 0, ideal: 0, completedHours: 0 });
        }
        return {
          startDate: sp.startDate,
          endDate: sp.endDate,
          totalHours: 0,
          totalPbis: 0,
          completedPbis: 0,
          points,
        };
      }

      const sbis = await ctx.db
        .select({
          props: schema.block.props,
          parentId: schema.block.parentId,
        })
        .from(schema.block)
        .where(
          and(
            inArray(
              schema.block.parentId,
              sprintPbis.map((p) => p.id),
            ),
            eq(schema.block.type, 'sbi'),
            isNull(schema.block.deletedAt),
          ),
        );

      for (const s of sbis) {
        const props = (s.props ?? {}) as { estimateHours?: number };
        totalHours += props.estimateHours ?? 0;
      }

      const nowMs = Date.now();
      for (let i = 0; i < days; i++) {
        const dayEnd = startMs + (i + 1) * 86_400_000;
        let completedHours = 0;
        for (const s of sbis) {
          const props = (s.props ?? {}) as {
            status?: string;
            completedAt?: string;
            estimateHours?: number;
          };
          if (props.status !== 'done' || !props.completedAt) continue;
          if (Date.parse(props.completedAt) <= dayEnd) {
            completedHours += props.estimateHours ?? 0;
          }
        }
        const remaining = Math.max(0, totalHours - completedHours);
        const ideal = days <= 1 ? 0 : Math.max(0, totalHours - (totalHours * i) / (days - 1));
        const date = new Date(startMs + i * 86_400_000).toISOString().slice(0, 10);
        points.push({ date, remaining, ideal, completedHours });
        // 未来日の実績は描かない（最後の確定日まででライン終端）
        if (startMs + i * 86_400_000 > nowMs) break;
      }

      const completedPbis = sprintPbis.filter(
        (p) => (p.props as { status?: string } | null)?.status === 'done',
      ).length;

      return {
        startDate: sp.startDate,
        endDate: sp.endDate,
        totalHours,
        totalPbis: sprintPbis.length,
        completedPbis,
        points,
      };
    }),
});
