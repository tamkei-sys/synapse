/**
 * Sprint router — 2-week iteration containers. Mirrors 大和心 Sprint.
 *
 * A Sprint is a Block with type='sprint'. PBIs reference it via
 * `props.sprintId`. SBIs roll up via their parent PBI; no direct edge
 * needed.
 */
import { TRPCError } from '@trpc/server';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { SPRINT_LENGTH_DAYS, sprintPropsSchema, sprintStatusSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { allocateHumanId } from '../lib/human-id.js';
import { assertWorkspaceMember } from '../lib/access.js';
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
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
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
      await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);

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
});
