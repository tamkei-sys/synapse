/**
 * Top-level tRPC router. Feature routers (workspace, page, pbi, …) are
 * mounted here as they land in subsequent sprints.
 */
import { isGithubOauthEnabled } from '../auth.js';
import { protectedProcedure, publicProcedure, router } from '../trpc.js';
import { aiRouter } from './ai.js';
import { apiTokenRouter } from './api-token.js';
import { auditRouter } from './audit.js';
import { blockRouter } from './block.js';
import { ccRouter } from './cc.js';
import { commentRouter } from './comment.js';
import { dbRouter } from './db.js';
import { dependencyRouter } from './dependency.js';
import { notificationRouter } from './notification.js';
import { pbiRouter } from './pbi.js';
import { projectRouter } from './project.js';
import { pushRouter } from './push.js';
import { sbiRouter } from './sbi.js';
import { searchRouter } from './search.js';
import { sprintRouter } from './sprint.js';
import { workspaceRouter } from './workspace.js';

export const appRouter = router({
  healthz: publicProcedure.query(() => ({ ok: true, service: 'synapse-api' })),

  /**
   * クライアントが /login で「GitHub でログイン」ボタンを出すか判断する用。
   * GITHUB_CLIENT_ID / SECRET が両方揃った dev / prod でのみ true。
   */
  authConfig: publicProcedure.query(({ ctx }) => ({
    githubOauthEnabled: isGithubOauthEnabled(ctx.env),
  })),

  me: protectedProcedure.query(({ ctx }) => ({
    user: ctx.session.user,
    sessionId: ctx.session.session.id,
  })),

  workspace: workspaceRouter,
  block: blockRouter,
  pbi: pbiRouter,
  project: projectRouter,
  sprint: sprintRouter,
  sbi: sbiRouter,
  dependency: dependencyRouter,
  apiToken: apiTokenRouter,
  search: searchRouter,
  ai: aiRouter,
  cc: ccRouter,
  audit: auditRouter,
  comment: commentRouter,
  notification: notificationRouter,
  push: pushRouter,
  db: dbRouter,
});

export type AppRouter = typeof appRouter;
