/**
 * SBI router — per-task children of a PBI. Mirrors 大和心 🟢 SBI.
 *
 * SBIs live as Block rows with type='sbi' and parentId=<pbi block id>.
 * That parent pointer is what gives PBI.progress its rollup (count of
 * SBIs whose status='done' over total non-archived).
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { sbiPropsSchema, sbiStatusSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { allocateHumanId } from '../lib/human-id.js';
import { assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

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
      await assertWorkspaceMember(ctx.db, pbi.workspaceId, ctx.session.user.id);

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
      await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      const merged = { ...current, ...input.patch };
      // Auto-stamp transitions for the lifecycle dates 大和心 tracks.
      if (input.patch.status === 'in_progress' && !current['startedAt']) {
        merged['startedAt'] = new Date().toISOString();
      }
      if (input.patch.status === 'done' && !current['completedAt']) {
        merged['completedAt'] = new Date().toISOString();
      }
      const validated = sbiPropsSchema.parse(merged);

      const [row] = await ctx.db
        .update(schema.block)
        .set({
          props: validated,
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
      await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      const merged: Record<string, unknown> = { ...current, status: input.status };
      if (input.status === 'in_progress' && !current['startedAt']) {
        merged['startedAt'] = new Date().toISOString();
      }
      if (input.status === 'done' && !current['completedAt']) {
        merged['completedAt'] = new Date().toISOString();
      }
      const validated = sbiPropsSchema.parse(merged);

      const [row] = await ctx.db
        .update(schema.block)
        .set({
          props: validated,
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.sbiId))
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),
});
