/**
 * AI router.
 *
 * `ai.ask` powers the spreadsheet `=ASK("...")` cell and any future
 * "ask Claude" surface. Workspace-scoped so we can later attribute
 * usage and enforce per-workspace quotas (CLAUDE.md §6 — every cc
 * session has a budget; the same pattern extends to API calls).
 *
 * Returned `stub: true` lets the client visually distinguish a real
 * Claude response from the deterministic dev fallback.
 */
import { z } from 'zod';

import { ask } from '../integrations/anthropic/client.js';
import { assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const aiRouter = router({
  ask: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        prompt: z.string().trim().min(1).max(2_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const result = await ask(ctx.env, input.prompt);
      return result;
    }),
});
