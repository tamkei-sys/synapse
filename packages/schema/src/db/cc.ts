/**
 * `cc_session` — one row per "Implement" click on a PBI.
 *
 * In S9 we ship the schema + tRPC + UI. The actual sandbox that runs
 * headless `cc` lives in a Cloudflare Container; for local dev a stub
 * worker simulates the session by transitioning states and writing a
 * placeholder `pr_url`. Production wiring is documented in
 * docs/integrations/claude-code.md.
 */
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { block } from './block.js';
import { workspace } from './workspace.js';

export const ccSession = pgTable(
  'cc_session',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    pbiId: text('pbi_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    /** queued → running → succeeded | failed | cancelled */
    status: text('status').notNull().default('queued'),
    /** When `status='succeeded'` and a PR was opened, the URL. */
    prUrl: text('pr_url'),
    /** Free-form last log line. Updated as the sandbox runs. */
    lastMessage: text('last_message'),
    /** Stub metadata (model, tools, etc.) so the UI can show context. */
    meta: jsonb('meta').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pbiIdx: index('cc_session_pbi_idx').on(t.pbiId, t.createdAt),
    workspaceIdx: index('cc_session_workspace_idx').on(t.workspaceId, t.createdAt),
  }),
);

export type CcSessionRow = typeof ccSession.$inferSelect;
export type NewCcSessionRow = typeof ccSession.$inferInsert;
export type CcSessionStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
