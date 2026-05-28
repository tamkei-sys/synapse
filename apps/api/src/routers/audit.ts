/**
 * Audit log read-side router.
 *
 * Mirrors the MCP audit_log table inserted by apps/mcp on every tool
 * call. The settings UI uses this to show workspace owners a feed of
 * agent activity — the "who did what when" hook required by CLAUDE.md
 * §6 ("every tool invocation produces an audit log").
 */
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const auditRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select({
          id: schema.auditLog.id,
          actorUserId: schema.auditLog.actorUserId,
          actorTokenId: schema.auditLog.actorTokenId,
          tool: schema.auditLog.tool,
          args: schema.auditLog.args,
          result: schema.auditLog.result,
          errorMessage: schema.auditLog.errorMessage,
          createdAt: schema.auditLog.createdAt,
        })
        .from(schema.auditLog)
        .where(eq(schema.auditLog.workspaceId, input.workspaceId))
        .orderBy(desc(schema.auditLog.createdAt))
        .limit(input.limit);
    }),
});
