/**
 * Block CRUD.
 *
 * S1 ships only the page lifecycle:
 *   - `listPages`   workspace's top-level pages
 *   - `createPage`  insert a new page block (and a first paragraph child)
 *   - `getPage`     fetch a page + its child blocks
 *
 * Position is a string so we can swap in fractional indexing later; for now
 * it's just the ULID, which is lexically ordered by creation time.
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
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

  /** Fetch a page block + its children (one level deep). */
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

      const children = await ctx.db
        .select()
        .from(schema.block)
        .where(and(eq(schema.block.parentId, page.id), isNull(schema.block.deletedAt)))
        .orderBy(asc(schema.block.position));

      return { page, children };
    }),

  /** Create a new page with a single empty paragraph as its first child. */
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
      const paragraphId = ulid();

      const result = await ctx.db.transaction(async (tx) => {
        const [page] = await tx
          .insert(schema.block)
          .values({
            id: pageId,
            workspaceId: input.workspaceId,
            parentId: null,
            type: 'page',
            position: pageId,
            props: { title: input.title },
            createdBy: ctx.session.user.id,
          })
          .returning();
        if (!page) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        await tx.insert(schema.block).values({
          id: paragraphId,
          workspaceId: input.workspaceId,
          parentId: pageId,
          type: 'paragraph',
          position: paragraphId,
          props: { text: '' },
          createdBy: ctx.session.user.id,
        });

        return page;
      });

      return result;
    }),
});
