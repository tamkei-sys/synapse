/**
 * PBI router.
 *
 * PBIs are stored as Block rows with `type='pbi'` and `parentId=null` —
 * they're top-level workspace items independent of any page. Pages
 * reference them via a TipTap `pbiRef` inline node that carries the
 * `blockId`, so editing a PBI on the board updates every doc that
 * embeds it.
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { pbiPropsSchema, pbiStatusSchema, type PbiProps } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const pbiRouter = router({
  /** All PBIs in the workspace, ordered by creation time. */
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
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
    }),

  /** Fetch a single PBI by id. */
  get: protectedProcedure
    .input(z.object({ pbiId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pbiId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });

      await assertWorkspaceMember(ctx.db, row.workspaceId, ctx.session.user.id);
      return row;
    }),

  /** Create a new PBI in the workspace. */
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        title: z.string().trim().min(1).max(200).default('Untitled PBI'),
        status: pbiStatusSchema.default('backlog'),
        storyPoints: z.number().int().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const props: PbiProps = {
        title: input.title,
        status: input.status,
        ...(typeof input.storyPoints === 'number' ? { storyPoints: input.storyPoints } : {}),
      };
      // Verify with the canonical Zod schema so feature consumers
      // (TipTap node, board view) can trust props shape on read.
      const validated = pbiPropsSchema.parse(props);

      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'pbi',
          position: id,
          props: validated,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),

  /** Patch fields on a PBI. */
  update: protectedProcedure
    .input(
      z.object({
        pbiId: z.string().min(1),
        patch: z.object({
          title: z.string().trim().min(1).max(200).optional(),
          status: pbiStatusSchema.optional(),
          storyPoints: z.number().int().min(0).max(100).nullable().optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pbiId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      // Honour `storyPoints: null` as "clear", everything else as patch.
      const merged: Record<string, unknown> = { ...current };
      if (input.patch.title !== undefined) merged['title'] = input.patch.title;
      if (input.patch.status !== undefined) merged['status'] = input.patch.status;
      if (input.patch.storyPoints === null) delete merged['storyPoints'];
      else if (typeof input.patch.storyPoints === 'number')
        merged['storyPoints'] = input.patch.storyPoints;

      const validated = pbiPropsSchema.parse(merged);

      const [updated] = await ctx.db
        .update(schema.block)
        .set({
          props: validated,
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.pbiId))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return updated;
    }),
});
