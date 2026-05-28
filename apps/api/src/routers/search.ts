/**
 * Search router.
 *
 * `search.query` runs a workspace-scoped full-text query against the
 * `blocks` collection in Typesense. If Typesense isn't configured (no
 * env vars), the procedure returns an empty list rather than 500-ing
 * — the UI degrades gracefully.
 */
import { z } from 'zod';

import { searchBlocks } from '../integrations/typesense/client.js';
import { assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const searchRouter = router({
  query: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        q: z.string().max(200),
        limit: z.number().int().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const result = await searchBlocks(ctx.env, input.workspaceId, input.q, input.limit);
      return {
        hits: result.hits.map((h) => h.document),
        found: result.found,
      };
    }),
});
