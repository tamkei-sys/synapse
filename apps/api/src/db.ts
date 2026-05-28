/**
 * Drizzle client backed by node-postgres.
 *
 * S1 ships local-dev only: wrangler dev runs inside the dev container with
 * `nodejs_compat` enabled, so a TCP `pg.Pool` works. Production Workers
 * deployment will switch to a Hyperdrive binding (or the Neon HTTP driver)
 * — see the architecture note in apps/api/wrangler.toml when that lands.
 *
 * The pool is constructed per Worker invocation with `max: 1` so a stale
 * connection from a previous request doesn't leak into the next isolate.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from '@synapse/schema/db';

export type Database = NodePgDatabase<typeof schema>;

export function createDb(databaseUrl: string): Database {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
  return drizzle(pool, { schema });
}
