/**
 * dev DB に対して migration SQL を流す one-shot ヘルパー。
 *
 *   node apps/api/scripts/run-migration.mjs packages/schema/migrations/0010_push_subscription.sql
 */
import { readFile } from 'node:fs/promises';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('usage: run-migration.mjs <path/to/migration.sql>');
  process.exit(1);
}
const sql = await readFile(file, 'utf-8');
// drizzle の statement-breakpoint は文字列なので split で分割。
const statements = sql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean);

const c = new pg.Client({ connectionString: 'postgres://synapse:synapse@127.0.0.1:54322/synapse_dev' });
await c.connect();
try {
  for (const stmt of statements) {
    await c.query(stmt);
    const head = stmt.split('\n')[0]?.slice(0, 80) ?? '';
    console.log('OK:', head);
  }
} finally {
  await c.end();
}
