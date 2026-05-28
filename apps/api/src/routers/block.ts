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

import { sheetCellsSchema, sheetPropsSchema } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
import { EMPTY_DOC } from '../lib/page-doc.js';
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

  /** Create a new sheet block (top-level, embeddable). */
  createSheet: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        rows: z.number().int().min(1).max(500).optional(),
        cols: z.number().int().min(1).max(26).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const id = ulid();
      const props = sheetPropsSchema.parse({
        ...(input.rows !== undefined ? { rows: input.rows } : {}),
        ...(input.cols !== undefined ? { cols: input.cols } : {}),
        cells: {},
      });
      const [row] = await ctx.db
        .insert(schema.block)
        .values({
          id,
          workspaceId: input.workspaceId,
          parentId: null,
          type: 'sheet',
          position: id,
          props,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return row;
    }),

  /** Fetch a sheet block by id (workspace-scoped). */
  getSheet: protectedProcedure
    .input(z.object({ sheetId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sheetId),
            eq(schema.block.type, 'sheet'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, row.workspaceId, ctx.session.user.id);
      return row;
    }),

  /**
   * Replace the cell map (last-write-wins for S7).
   *
   * Server still re-validates with Zod so feature code on read can
   * trust the shape — the client is not the trust boundary.
   */
  updateSheetCells: protectedProcedure
    .input(z.object({ sheetId: z.string().min(1), cells: sheetCellsSchema }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
        .from(schema.block)
        .where(
          and(
            eq(schema.block.id, input.sheetId),
            eq(schema.block.type, 'sheet'),
            isNull(schema.block.deletedAt),
          ),
        )
        .limit(1);
      if (!existing) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, existing.workspaceId, ctx.session.user.id);

      const current = (existing.props ?? {}) as Record<string, unknown>;
      const validated = sheetPropsSchema.parse({ ...current, cells: input.cells });
      const [updated] = await ctx.db
        .update(schema.block)
        .set({
          props: validated,
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.sheetId))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return updated;
    }),

  /**
   * Persist the page title.
   *
   * Body content is owned by Yjs / Hocuspocus (see apps/sync); the title
   * stays in `block.props.title` so the workspace's page list can render
   * it without spinning up a CRDT connection.
   */
  updatePageTitle: protectedProcedure
    .input(
      z.object({
        pageId: z.string().min(1),
        title: z.string().trim().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({
          workspaceId: schema.block.workspaceId,
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

      const currentProps = (existing.props ?? {}) as Record<string, unknown>;
      const [updated] = await ctx.db
        .update(schema.block)
        .set({
          props: { ...currentProps, title: input.title },
          version: sql`${schema.block.version} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(schema.block.id, input.pageId))
        .returning();
      if (!updated) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return updated;
    }),
});
