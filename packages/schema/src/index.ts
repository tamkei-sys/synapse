// @synapse/schema — shared Zod + Drizzle schema entry.
// Drizzle tables live under `./db`; re-exported here for convenience.

export * from './models.js';
export * as db from './db/index.js';
