/**
 * Long-lived Drizzle / pg pool for the sync server.
 *
 * Unlike the API (one isolate per request → `max: 1`), the sync server is
 * a long-running Node process serving many websocket connections, so a
 * proper pool is the right shape.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from '@synapse/schema/db';

export type Database = NodePgDatabase<typeof schema>;

export function createDb(databaseUrl: string): Database {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 10 });
  return drizzle(pool, { schema });
}

export { schema };
