/**
 * Per-request Drizzle client factory.
 *
 * Cloudflare Workers spin up a fresh isolate per request; we cannot keep a
 * connection pool around. `@neondatabase/serverless` exposes an HTTP-driver
 * that has no socket state, so constructing it per request is cheap.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http';

import * as schema from '@synapse/schema/db';

export type Database = NeonHttpDatabase<typeof schema>;

export function createDb(databaseUrl: string): Database {
  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}
