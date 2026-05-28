/**
 * Top-level tRPC router. Feature routers (workspace, page, pbi, …) are
 * mounted here as they land in subsequent sprints.
 */
import { protectedProcedure, publicProcedure, router } from '../trpc.js';
import { blockRouter } from './block.js';
import { pbiRouter } from './pbi.js';
import { workspaceRouter } from './workspace.js';

export const appRouter = router({
  healthz: publicProcedure.query(() => ({ ok: true, service: 'synapse-api' })),

  me: protectedProcedure.query(({ ctx }) => ({
    user: ctx.session.user,
    sessionId: ctx.session.session.id,
  })),

  workspace: workspaceRouter,
  block: blockRouter,
  pbi: pbiRouter,
});

export type AppRouter = typeof appRouter;
