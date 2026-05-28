import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle config for local migration generation. The runtime connection
 * lives in `apps/api`; this file is only used by `drizzle-kit` CLI commands
 * (`db:generate`, `db:migrate`, `db:studio`).
 *
 * `schema` points at the compiled `dist/` output rather than the TS source.
 * drizzle-kit's loader does not rewrite `.js` import specifiers to `.ts`, so
 * the schema barrel's NodeNext-style imports (e.g. `from './auth.js'`) would
 * fail at module resolution time. Running `tsc -b` first sidesteps that —
 * the `db:generate` / `db:migrate` scripts in package.json do exactly that.
 */
export default defineConfig({
  schema: './dist/db/index.js',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/synapse_dev',
  },
  strict: true,
  verbose: true,
});
