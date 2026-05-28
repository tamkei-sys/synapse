/**
 * Workspace CRUD.
 *
 * Identity rules:
 *   - `id` is a ULID generated on the server.
 *   - `slug` is derived from the name with a ULID-suffix tiebreaker so
 *     parallel sign-ups never collide.
 *
 * Every authenticated user gets a row in `workspace_member` with role `owner`
 * for workspaces they create. Membership is the only thing that grants
 * access in subsequent queries (enforced in feature routers, not here).
 */
import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { slugify, suffixedSlug } from '../lib/slug.js';
import { protectedProcedure, router } from '../trpc.js';

export const workspaceRouter = router({
  /** List workspaces the current user is a member of. */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({ workspaceId: schema.workspaceMember.workspaceId })
      .from(schema.workspaceMember)
      .where(eq(schema.workspaceMember.userId, ctx.session.user.id));

    if (memberships.length === 0) return [];

    const ids = memberships.map((m) => m.workspaceId);
    return ctx.db.select().from(schema.workspace).where(inArray(schema.workspace.id, ids));
  }),

  /** Create a new workspace and add the caller as `owner`. */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(80),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const id = ulid();
      const slug = suffixedSlug(input.name, id);

      // Single transaction so a half-created workspace is impossible.
      const created = await ctx.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(schema.workspace)
          .values({
            id,
            slug,
            name: input.name.trim(),
            createdBy: ctx.session.user.id,
          })
          .returning();
        if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

        await tx.insert(schema.workspaceMember).values({
          workspaceId: row.id,
          userId: ctx.session.user.id,
          role: 'owner',
        });

        return row;
      });

      return created;
    }),

  /** Convenience: returns existing default workspace or creates one. */
  createDefault: protectedProcedure.mutation(async ({ ctx }) => {
    const existing = await ctx.db
      .select()
      .from(schema.workspace)
      .innerJoin(
        schema.workspaceMember,
        and(
          eq(schema.workspaceMember.workspaceId, schema.workspace.id),
          eq(schema.workspaceMember.userId, ctx.session.user.id),
        ),
      )
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      return existing[0].workspace;
    }

    const fallbackName =
      ctx.session.user.name?.split(/\s+/)[0]?.trim() ||
      ctx.session.user.email.split('@')[0] ||
      'My workspace';

    const id = ulid();
    const slug = suffixedSlug(slugify(fallbackName) || 'workspace', id);

    const created = await ctx.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(schema.workspace)
        .values({
          id,
          slug,
          name: `${fallbackName}'s workspace`,
          createdBy: ctx.session.user.id,
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      await tx.insert(schema.workspaceMember).values({
        workspaceId: row.id,
        userId: ctx.session.user.id,
        role: 'owner',
      });
      return row;
    });

    return created;
  }),
});
