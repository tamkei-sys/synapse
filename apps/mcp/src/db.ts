/**
 * Long-lived Drizzle pool for the MCP server. The MCP process is a
 * single subprocess shared by one cc session, so a small pool is right.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from '@synapse/schema/db';

export type Database = NodePgDatabase<typeof schema>;

export function createDb(databaseUrl: string): Database {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: 4 });
  return drizzle(pool, { schema });
}

export { schema };
