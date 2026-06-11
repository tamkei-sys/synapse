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

import {
  pbiEstimateSchema,
  pbiGithubLinkSchema,
  pbiPropsSchema,
  pbiStatusSchema,
  prioritySchema,
} from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';
import { pushPbiToGithub } from '../integrations/github/outbound.js';
import { indexBlock } from '../integrations/typesense/client.js';
import { projectBlock } from '../integrations/typesense/extract.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { allocateHumanId } from '../lib/human-id.js';
import { atomicPropsMerge } from '../lib/props-merge.js';
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

  /** PBIs that belong to a given project (via `props.projectId`). */
  listForProject: protectedProcedure
    .input(z.object({ projectId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.projectId),
            eq(schema.block.type, 'project'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!project) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, project.workspaceId, ctx.session.user.id);

      const rows = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, project.workspaceId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
      return rows.filter(
        (r) => (r.props as { projectId?: string } | null)?.projectId === input.projectId,
      );
    }),

  /** PBIs that belong to a given sprint (via `props.sprintId`). */
  listForSprint: protectedProcedure
    .input(z.object({ sprintId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [sprint] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
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

      const rows = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.workspaceId, sprint.workspaceId),
            eq(schema.block.type, 'pbi'),
            isNull(schema.block.deletedAt),
          ),
        )
        .orderBy(asc(schema.block.position));
      return rows.filter(
        (r) => (r.props as { sprintId?: string } | null)?.sprintId === input.sprintId,
      );
    }),

  /**
   * Create a new PBI in the workspace.
   *
   * Optional `projectId` / `sprintId` bind the new PBI to a parent
   * container so the relationship is visible the moment it's created
   * (matches 大和心's flow where you pick a project before issuing the
   * PBI). A workspace-scoped `PBI-<n>` is allocated atomically.
   */
  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        title: z.string().trim().min(1).max(200).default('Untitled PBI'),
        status: pbiStatusSchema.default('backlog'),
        priority: prioritySchema.optional(),
        estimate: pbiEstimateSchema.optional(),
        storyPoints: z.number().int().min(0).max(100).optional(),
        projectId: z.string().optional(),
        sprintId: z.string().optional(),
        dueDate: z.string().date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanWrite(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const { number } = await allocateHumanId(ctx.db, input.workspaceId, 'pbi');
      // Defer to Zod for default-filling — priority etc. have defaults.
      const validated = pbiPropsSchema.parse({
        title: input.title,
        status: input.status,
        number,
        ...(input.priority ? { priority: input.priority } : {}),
        ...(typeof input.estimate === 'number' ? { estimate: input.estimate } : {}),
        ...(typeof input.storyPoints === 'number' ? { storyPoints: input.storyPoints } : {}),
        ...(input.projectId ? { projectId: input.projectId } : {}),
        ...(input.sprintId ? { sprintId: input.sprintId } : {}),
        ...(input.dueDate ? { dueDate: input.dueDate } : {}),
      });

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

  /** Patch fields on a PBI. */
  update: protectedProcedure
    .input(
      z.object({
        pbiId: z.string().min(1),
        patch: z.object({
          title: z.string().trim().min(1).max(200).optional(),
          status: pbiStatusSchema.optional(),
          priority: prioritySchema.optional(),
          estimate: pbiEstimateSchema.optional(),
          storyPoints: z.number().int().min(0).max(100).nullable().optional(),
          /** `null` clears the parent project link. */
          projectId: z.string().nullable().optional(),
          /** `null` clears the sprint link. */
          sprintId: z.string().nullable().optional(),
          /** Replace the assignee set entirely. `[]` clears it. */
          assigneeIds: z.array(z.string()).max(16).optional(),
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

      await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      // Honour explicit `null` as "clear this field"; numeric / string
      // values overwrite; `undefined` keeps the current value.
      const setEntries: Record<string, unknown> = {};
      const clearKeys: string[] = [];
      if (input.patch.title !== undefined) setEntries['title'] = input.patch.title;
      if (input.patch.status !== undefined) setEntries['status'] = input.patch.status;
      if (input.patch.priority !== undefined) setEntries['priority'] = input.patch.priority;
      if (input.patch.estimate !== undefined) setEntries['estimate'] = input.patch.estimate;
      if (input.patch.storyPoints === null) clearKeys.push('storyPoints');
      else if (typeof input.patch.storyPoints === 'number')
        setEntries['storyPoints'] = input.patch.storyPoints;
      if (input.patch.projectId === null) clearKeys.push('projectId');
      else if (typeof input.patch.projectId === 'string')
        setEntries['projectId'] = input.patch.projectId;
      if (input.patch.sprintId === null) clearKeys.push('sprintId');
      else if (typeof input.patch.sprintId === 'string')
        setEntries['sprintId'] = input.patch.sprintId;
      if (input.patch.assigneeIds !== undefined) {
        if (input.patch.assigneeIds.length === 0) clearKeys.push('assigneeIds');
        else setEntries['assigneeIds'] = input.patch.assigneeIds;
      }

      // 検証ゲート：マージ結果がスキーマ違反ならここで弾く（書き込みには使わない）。
      const merged: Record<string, unknown> = { ...current, ...setEntries };
      for (const key of clearKeys) delete merged[key];
      const validated = pbiPropsSchema.parse(merged);

      // 書き込みは patch のキーだけの単一 UPDATE 文の jsonb マージ。全量書き戻し
      // は並行する update / GitHub webhook / MCP の書き込みを巻き戻す lost update
      // になる（lib/props-merge.ts 参照）。
      const [updated] = await ctx.db
        .update(schema.block)
        .set({
          props: atomicPropsMerge({ set: setEntries, clear: clearKeys }),
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.pbiId))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Fire-and-forget outbound push if a GitHub link exists. We don't
      // block the caller on it — the network round-trip would breach the
      // tRPC <100ms budget. Failures only warn; the next change retries.
      const linkBefore = (current['github'] as PbiGithubLinkLike | undefined) ?? undefined;
      void pushPbiToGithub(ctx.env, {
        title: validated.title,
        status: validated.status,
        github: validated.github ?? linkBefore,
      });
      const indexDoc = projectBlock(updated);
      if (indexDoc) {
        try {
          await indexBlock(ctx.env, indexDoc);
        } catch (err) {
          console.warn('[search] indexBlock failed:', err);
        }
      }
      return updated;
    }),

  /** Attach a GitHub Issue reference to a PBI. */
  linkGithubIssue: protectedProcedure
    .input(z.object({ pbiId: z.string().min(1), link: pbiGithubLinkSchema }))
    .mutation(async ({ ctx, input }) => {
      const updated = await mergeLinkAndUpdate(ctx, input.pbiId, {
        ...input.link,
        syncedAt: new Date().toISOString(),
      });
      return updated;
    }),

  /** Detach the GitHub Issue reference (does not delete the issue). */
  unlinkGithubIssue: protectedProcedure
    .input(z.object({ pbiId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const updated = await mergeLinkAndUpdate(ctx, input.pbiId, undefined);
      return updated;
    }),
});

type PbiGithubLinkLike = {
  owner: string;
  repo: string;
  issueNumber: number;
  state?: 'open' | 'closed';
  syncedAt?: string;
};

async function mergeLinkAndUpdate(
  ctx: { db: Database; session: { user: { id: string } } },
  pbiId: string,
  link: PbiGithubLinkLike | undefined,
) {
  const [existing] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(
      and(eq(schema.block.id, pbiId), eq(schema.block.type, 'pbi'), isNull(schema.block.deletedAt)),
    )
    .limit(1);
  if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
  await assertCanWrite(ctx.db, existing.workspaceId, ctx.session.user.id);

  // github キーだけを set / 削除する原子マージ（link は入力スキーマで検証済み）。
  // 全量書き戻しは並行する update / webhook の書き込みを巻き戻す（lib/props-merge.ts）。
  const [updated] = await ctx.db
    .update(schema.block)
    .set({
      props: atomicPropsMerge(link ? { set: { github: link } } : { clear: ['github'] }),
      version: sql`${schema.block.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.block.id, pbiId))
    .returning();
  if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  return updated;
}
