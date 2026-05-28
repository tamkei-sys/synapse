/**
 * Workspace-scoped auto-increment sequence.
 *
 * 大和心 gives every PBI / SBI / Project / Sprint a human-readable id
 * like `PBI-397`. We allocate those from this table, one counter per
 * `(workspace_id, kind)` pair. The counter is bumped inside a single
 * UPDATE … RETURNING so it stays atomic without needing a Postgres
 * SEQUENCE per workspace (which would explode in DDL volume).
 */
import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { workspace } from './workspace.js';

export const entitySequence = pgTable(
  'entity_sequence',
  {
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    /** Entity kind — matches Block.type for entities we surface ids for. */
    kind: text('kind').notNull(), // 'project' | 'pbi' | 'sbi' | 'sprint'
    nextId: integer('next_id').notNull().default(1),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.workspaceId, t.kind] }),
  }),
);

export type EntitySequenceRow = typeof entitySequence.$inferSelect;
