/**
 * Block dependency router. 大和心 calls this 「次のプロジェクトを保留中」.
 *
 * One edge: `block` is blocked by `dependsOn`. Either side can list
 * its edges; the UI shows blocked-by chips on cards and a "blocks N
 * others" hint upstream.
 */
import { TRPCError } from '@trpc/server';
import { and, eq, isNull, inArray } from 'drizzle-orm';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const dependencyRouter = router({
  listForBlock: protectedProcedure
    .input(z.object({ blockId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [block] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(and(eq(schema.block.id, input.blockId), isNull(schema.block.deletedAt)))
        .limit(1);
      if (!block) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, block.workspaceId, ctx.session.user.id);

      const blockedBy = await ctx.db
        .select({
          id: schema.blockDependency.dependsOnId,
          note: schema.blockDependency.note,
        })
        .from(schema.blockDependency)
        .where(eq(schema.blockDependency.blockId, input.blockId));
      const blocks = await ctx.db
        .select({
          id: schema.blockDependency.blockId,
          note: schema.blockDependency.note,
        })
        .from(schema.blockDependency)
        .where(eq(schema.blockDependency.dependsOnId, input.blockId));
      return { blockedBy, blocks };
    }),

  add: protectedProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        dependsOnId: z.string().min(1),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.blockId === input.dependsOnId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'A block cannot depend on itself.' });
      }
      const rows = await ctx.db
        .select({ id: schema.block.id, workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(
          and(
            inArray(schema.block.id, [input.blockId, input.dependsOnId]),
            isNull(schema.block.deletedAt),
          ),
        );
      if (rows.length !== 2) throw new TRPCError({ code: 'NOT_FOUND' });
      const [a, b] = rows;
      if (!a || !b || a.workspaceId !== b.workspaceId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cross-workspace dependency.' });
      }
      await assertCanWrite(ctx.db, a.workspaceId, ctx.session.user.id);

      await ctx.db
        .insert(schema.blockDependency)
        .values({
          blockId: input.blockId,
          dependsOnId: input.dependsOnId,
          ...(input.note !== undefined ? { note: input.note } : {}),
        })
        .onConflictDoNothing();
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ blockId: z.string().min(1), dependsOnId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const [block] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(eq(schema.block.id, input.blockId))
        .limit(1);
      if (!block) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanWrite(ctx.db, block.workspaceId, ctx.session.user.id);
      await ctx.db
        .delete(schema.blockDependency)
        .where(
          and(
            eq(schema.blockDependency.blockId, input.blockId),
            eq(schema.blockDependency.dependsOnId, input.dependsOnId),
          ),
        );
      return { ok: true };
    }),
});
