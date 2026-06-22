/**
 * Project router. Mirrors 大和心 🔴 プロジェクト.
 *
 * A Project is a Block with type='project' and parentId=null. PBIs
 * reference it via `props.projectId`; the relation lives in jsonb
 * (rather than block.parentId) so the same PBI can move between
 * projects without rewriting the parent pointer.
 *
 * Every project gets a workspace-scoped human id (`PRJ-<n>`) on create.
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { projectPropsSchema, projectStatusSchema, prioritySchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { allocateHumanId } from '../lib/human-id.js';
import { indexBlock } from '../integrations/typesense/client.js';
import { projectBlock } from '../integrations/typesense/extract.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { atomicPropsMerge } from '../lib/props-merge.js';
import { protectedProcedure, router } from '../trpc.js';

export const projectRouter = router({
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
            eq(schema.block.type, 'project'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
    }),

  get: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.projectId),
            eq(schema.block.type, 'project'),
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
        status: projectStatusSchema.optional(),
        priority: prioritySchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const { number } = await allocateHumanId(ctx.db, input.workspaceId, 'project');
      const props = projectPropsSchema.parse({
        name: input.name,
        ...(input.status ? { status: input.status } : {}),
        ...(input.priority ? { priority: input.priority } : {}),
        number,
      });
      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'project',
          position: id,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      const doc = projectBlock(row);
      if (doc) {
        try {
          await indexBlock(ctx.env, doc);
        } catch (err) {
          console.warn('[search] indexBlock failed:', err);
        }
      }
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        patch: projectPropsSchema.partial(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.projectId),
            eq(schema.block.type, 'project'),
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
      // 検証ゲート：マージ結果のスキーマ違反はここで弾く（書き込みには使わない）。
      projectPropsSchema.parse({ ...current, ...patch });

      // 書き込みは patch キーだけの単一 UPDATE 文の jsonb マージ。全量書き戻しは
      // 並行する update / MCP の書き込みを巻き戻す（lib/props-merge.ts 参照）。
      const [row] = await ctx.db
        .update(schema.block)
        .set({
          props: atomicPropsMerge({ set: patch }),
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.projectId))
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),
});
