/**
 * cc session router.
 *
 * S9 surface:
 *   - cc.startForPbi  spawn a stub session for a PBI
 *   - cc.list         sessions for a workspace
 *   - cc.getForPbi    latest session per PBI (the "Implement" badge)
 *
 * Production swaps `startStubSession` for the Cloudflare Container
 * binding; everything above this line stays unchanged.
 */
import { TRPCError } from '@trpc/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { startStubSession } from '../integrations/cc/sandbox-stub.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const ccRouter = router({
  startForPbi: protectedProcedure
    .input(z.object({ pbiId: z.string().min(1) }))
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
      await assertCanWrite(ctx.db, pbi.workspaceId, ctx.session.user.id);

      const id = ulid();
      const [row] = await ctx.db
        .insert(schema.ccSession)
        .values({
          id,
          workspaceId: pbi.workspaceId,
          pbiId: input.pbiId,
          createdBy: ctx.session.user.id,
          status: 'queued',
          lastMessage: 'queued for sandbox',
          meta: { sandbox: 'stub-v1' },
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Hand the simulated lifecycle to workerd via waitUntil — without
      // it the isolate dies right after this response returns and the
      // status stays stuck on `queued`. See trpc.ts `WaitUntil`.
      ctx.waitUntil(startStubSession(ctx.db, row.id));
      return row;
    }),

  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select()
        .from(schema.ccSession)
        .where(eq(schema.ccSession.workspaceId, input.workspaceId))
        .orderBy(desc(schema.ccSession.createdAt));
    }),

  getForPbi: protectedProcedure
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
      if (!pbi) return null;
      await assertWorkspaceMember(ctx.db, pbi.workspaceId, ctx.session.user.id);

      const [latest] = await ctx.db
        .select()
        .from(schema.ccSession)
        .where(eq(schema.ccSession.pbiId, input.pbiId))
        .orderBy(desc(schema.ccSession.createdAt))
        .limit(1);
      return latest ?? null;
    }),
});
