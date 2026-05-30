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

import { startCcSession } from '../integrations/cc/container.js';
import { assertCanWrite, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

/** デフォルト allowedTools. CLAUDE.md §6: 明示 allowlist だけ。 */
const DEFAULT_ALLOWED_TOOLS = ['Read', 'Edit', 'Write', 'Bash', 'Grep'] as const;

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
      const usingContainer = Boolean(
        ctx.env.CC_CONTAINER && ctx.env.CC_API_BASE && ctx.env.CC_SESSION_TOKEN_SECRET,
      );
      const [row] = await ctx.db
        .insert(schema.ccSession)
        .values({
          id,
          workspaceId: pbi.workspaceId,
          pbiId: input.pbiId,
          createdBy: ctx.session.user.id,
          status: 'queued',
          lastMessage: usingContainer ? 'queued for cf-container' : 'queued for stub',
          meta: { sandbox: usingContainer ? 'cf-container-v1' : 'stub-v1' },
        })
        .returning();
      if (!row) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      // Hand the lifecycle to workerd via waitUntil — without it the
      // isolate dies right after this response returns and the status
      // stays stuck on `queued`. See trpc.ts `WaitUntil`.
      ctx.waitUntil(
        startCcSession(ctx.db, ctx.env, {
          sessionId: row.id,
          pbiId: input.pbiId,
          prompt: `Implement ${input.pbiId}`,
          allowedTools: DEFAULT_ALLOWED_TOOLS,
        }),
      );
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
