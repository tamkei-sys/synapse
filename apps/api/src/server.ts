/**
 * Node-importable server surface for in-process consumers (e.g. the SYNAPSE
 * MCP server), kept separate from the Cloudflare Workers entrypoint in
 * `index.ts`.
 *
 * `index.ts` constructs the Hono `app` and is the Workers fetch/cron entry —
 * importing it would run that Workers-oriented bootstrap. This module exposes
 * only the tRPC router (and a service caller, below) so a plain Node process
 * can drive the same procedures without pulling in the HTTP app.
 */
export { appRouter, type AppRouter } from './routers/index.js';
export { createServiceCaller, type ServiceCaller } from './service-caller.js';
export type { Env } from './env.js';
