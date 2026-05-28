/**
 * Top-level tRPC router. Feature routers (workspace, page, pbi, …) are
 * mounted here as they land in subsequent sprints.
 */
import { protectedProcedure, publicProcedure, router } from '../trpc.js';

export const appRouter = router({
  healthz: publicProcedure.query(() => ({ ok: true, service: 'synapse-api' })),

  me: protectedProcedure.query(({ ctx }) => ({
    user: ctx.session.user,
    sessionId: ctx.session.session.id,
  })),
});

export type AppRouter = typeof appRouter;
