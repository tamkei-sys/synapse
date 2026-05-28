/**
 * Block CRUD — page lifecycle.
 *
 * In S2 the canonical content of a page lives in `page.props.doc` as a
 * TipTap / ProseMirror JSON document. Child block rows (paragraph,
 * heading, …) are deliberately not fanned out yet — that's a S3+
 * projection so search / backlinks have something to index. For now the
 * editor is the source of truth.
 *
 * `position` is the ULID so blocks are lexically ordered by creation
 * time; fractional indexing can slot in later without a schema change.
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
import { EMPTY_DOC, pageDocSchema } from '../lib/page-doc.js';
import { protectedProcedure, router } from '../trpc.js';

const workspaceIdInput = z.object({ workspaceId: z.string().min(1) });

export const blockRouter = router({
  /** Top-level page blocks in the workspace. */
  listPages: protectedProcedure.input(workspaceIdInput).query(async ({ ctx, input }) => {
    await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);

    return ctx.db
      .select()
      .from(schema.block)
      .where(
        and(
          eq(schema.block.workspaceId, input.workspaceId),
          eq(schema.block.type, 'page'),
          isNull(schema.block.parentId),
          isNull(schema.block.deletedAt),
        ),
      )
      .orderBy(asc(schema.block.position));
  }),

  /** Fetch a page block. */
  getPage: protectedProcedure
    .input(z.object({ pageId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [page] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!page) throw new TRPCError({ code: 'NOT_FOUND' });

      await assertWorkspaceMember(ctx.db, page.workspaceId, ctx.session.user.id);
      return { page };
    }),

  /** Create a new page seeded with an empty TipTap doc. */
  createPage: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        title: z.string().trim().min(1).max(200).default('Untitled'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);

      const pageId = ulid();
      const [page] = await ctx.db
        .insert(schema.block)
        .values({
          id: pageId,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'page',
          position: pageId,
          props: { title: input.title, doc: EMPTY_DOC },
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!page) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return page;
    }),

  /**
   * Persist editor content.
   *
   * Optimistic concurrency: the caller passes the `version` it last saw;
   * if the DB row has moved on, we reject with CONFLICT so the client can
   * reload (and surface a banner) rather than silently clobbering a peer.
   */
  updatePageContent: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        version: z.number().int().nonnegative(),
        title: z.string().trim().min(1).max(200).optional(),
        doc: pageDocSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({
          workspaceId: schema.block.workspaceId,
          version: schema.block.version,
          props: schema.block.props,
        })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.pageId),
            eq(schema.block.type, 'page'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });

      await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);

      if (existing.version !== input.version) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Page was updated elsewhere — please reload.',
        });
      }

      const currentProps = (existing.props ?? {}) as Record<string, unknown>;
      const nextTitle =
        typeof input.title === 'string'
          ? input.title
          : typeof currentProps['title'] === 'string'
            ? (currentProps['title'] as string)
            : 'Untitled';

      const [updated] = await ctx.db
        .update(schema.block)
        .set({
          props: { ...currentProps, title: nextTitle, doc: input.doc },
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.block.id, input.pageId), eq(schema.block.version, input.version)))
        .returning();

      if (!updated) {
        // Race between SELECT and UPDATE — surface as the same conflict.
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Page was updated elsewhere — please reload.',
        });
      }
      return updated;
    }),
});
