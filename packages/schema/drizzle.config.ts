import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle config for local migration generation. The runtime connection lives
 * in `apps/api`; this file is only used by `drizzle-kit` CLI commands
 * (`db:generate`, `db:migrate`, `db:studio`).
 */
export default defineConfig({
  schema: './src/db/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://localhost:5432/synapse_dev',
  },
  strict: true,
  verbose: true,
});
