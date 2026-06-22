/**
 * Node entrypoint for VPS-native deployment (ADR-0013).
 *
 * The Workers entry (`src/index.ts`) stays the source of truth; this file is
 * deliberately a ~50-line untyped ESM glue so `tsconfig.json` can keep
 * `types: ["@cloudflare/workers-types"]` without pulling Node types into the
 * Workers compilation. All application logic remains in the typed `dist/` build.
 *
 * Reading `process.env` here does NOT violate the "use c.env, never
 * process.env" rule — that rule guards Workers code; this entry exists only
 * where there is no Workers runtime, and it passes the env straight into the
 * same `c.env` seam the worker uses.
 *
 * Run: `pnpm build && pnpm start:node` (requires dist/index.js).
 */
import { serve } from '@hono/node-server';

import worker from './dist/index.js';

const REQUIRED = ['DATABASE_URL', 'BETTER_AUTH_URL', 'BETTER_AUTH_SECRET', 'WEB_ORIGIN'];
const missing = REQUIRED.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(`[synapse-api] missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

const env = process.env;

// Workers' ExecutionContext equivalent: Node's event loop keeps pending
// promises alive on its own, so waitUntil only needs to surface rejections.
const executionCtx = {
  waitUntil: (promise) => {
    Promise.resolve(promise).catch((err) => console.error('[synapse-api] waitUntil:', err));
  },
  passThroughOnException: () => {},
};

const port = Number(process.env.API_PORT ?? 8790);
const hostname = process.env.API_HOST ?? '127.0.0.1';

serve({ fetch: (req) => worker.fetch(req, env, executionCtx), port, hostname }, (info) => {
  console.info(`[synapse-api] listening on http://${info.address}:${info.port}`);
});

// Cron Trigger substitute: wrangler.toml schedules `* * * * *`, so fire the
// same scheduled handler once a minute (reminder dispatch + trash purge).
setInterval(() => {
  try {
    // ScheduledController is unused by the handler; pass undefined.
    worker.scheduled?.(undefined, env, executionCtx);
  } catch (err) {
    console.error('[synapse-api] scheduled:', err);
  }
}, 60_000);
