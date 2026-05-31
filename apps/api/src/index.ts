/**
 * SYNAPSE API entrypoint.
 *
 * Hono mounts three concerns:
 *   - `/healthz`        cheap liveness probe (no DB)
 *   - `/api/auth/*`     Better-Auth handler (login, signup, session, ...)
 *   - `/trpc/*`         tRPC v11 procedures (workspace/block ops)
 *
 * CORS allows only `WEB_ORIGIN`; credentialed requests are required for
 * Better-Auth cookies to flow.
 */
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { createAuth } from './auth.js';
import { createDb } from './db.js';
import type { AppBindings, Env } from './env.js';
import { createGithubWebhookRouter } from './integrations/github/webhook.js';
import { purgeOldTrash } from './lib/purge-trash.js';
import { dispatchDueReminders } from './lib/reminder-dispatch.js';
import { appRouter } from './routers/index.js';
import { createTrpcContext } from './trpc.js';

const app = new Hono<AppBindings>();

app.use(
  '*',
  cors({
    origin: (origin, c) => (origin === c.env.WEB_ORIGIN ? origin : null),
    credentials: true,
  }),
);

app.get('/healthz', (c) => c.json({ ok: true, service: 'synapse-api' }));

// Better-Auth mounts at /api/auth/**; it owns route resolution from there.
app.on(['GET', 'POST'], '/api/auth/*', (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

app.all('/trpc/*', (c) =>
  fetchRequestHandler({
    endpoint: '/trpc',
    req: c.req.raw,
    router: appRouter,
    createContext: (opts) =>
      createTrpcContext(c.env, opts, (p) => {
        // Hand off to workerd so the isolate stays alive past the response.
        // `executionCtx` is always present in real Workers requests; the
        // optional chain defends against synthetic Hono test contexts.
        c.executionCtx?.waitUntil(p);
      }),
  }),
);

// GitHub App webhook receiver. CORS doesn't apply (server-to-server) but
// mounting under `/api/integrations/github` keeps the URL space tidy.
app.route('/api/integrations/github', createGithubWebhookRouter());

export type { AppRouter } from './routers/index.js';

export default {
  fetch: app.fetch,
  /**
   * Cron Trigger (PBI-68): due なリマインダーを全 WS で dispatch する。
   * dev には cron が無いので発火しない（reminder.processDue が代替）。
   */
  scheduled: async (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
    const db = createDb(env.DATABASE_URL);
    // due リマインダー配信 + 古いゴミ箱の自動パージ (PBI-68 / PBI-90)。
    ctx.waitUntil(Promise.all([dispatchDueReminders(db, {}), purgeOldTrash(db, {})]));
  },
};
