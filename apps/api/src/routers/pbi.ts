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

import { pbiGithubLinkSchema, pbiPropsSchema, pbiStatusSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';
import { pushPbiToGithub } from '../integrations/github/outbound.js';
import { indexBlock } from '../integrations/typesense/client.js';
import { projectBlock } from '../integrations/typesense/extract.js';
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
      // Defer to Zod for default-filling — priority etc. have defaults.
      const validated = pbiPropsSchema.parse({
        title: input.title,
        status: input.status,
        ...(typeof input.storyPoints === 'number' ? { storyPoints: input.storyPoints } : {}),
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
      const updated = await mergeLinkAndUpdate(ctx, input.pbiId, () => ({
        ...input.link,
        syncedAt: new Date().toISOString(),
      }));
      return updated;
    }),

  /** Detach the GitHub Issue reference (does not delete the issue). */
  unlinkGithubIssue: protectedProcedure
    .input(z.object({ pbiId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const updated = await mergeLinkAndUpdate(ctx, input.pbiId, () => undefined);
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
  nextLink: (current: PbiGithubLinkLike | undefined) => PbiGithubLinkLike | undefined,
) {
  const [existing] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
    .from(schema.block)
    .where(
      and(eq(schema.block.id, pbiId), eq(schema.block.type, 'pbi'), isNull(schema.block.deletedAt)),
    )
    .limit(1);
  if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
  await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);

  const current = (existing.props ?? {}) as Record<string, unknown>;
  const link = nextLink(current['github'] as PbiGithubLinkLike | undefined);
  const next: Record<string, unknown> = { ...current };
  if (link === undefined) delete next['github'];
  else next['github'] = link;

  const validated = pbiPropsSchema.parse(next);
  const [updated] = await ctx.db
    .update(schema.block)
    .set({
      props: validated,
      version: sql`${schema.block.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.block.id, pbiId))
    .returning();
  if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
  return updated;
}
