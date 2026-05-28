/**
 * Block-on-block blocking relation.
 *
 * Mirrors 大和心's "次のプロジェクトを保留中／により保留中" pair. The
 * canonical shape is a join row: `blockId` is blocked by
 * `dependsOnId`. We expose both directions via Drizzle relations in
 * feature code.
 *
 * The composite PK prevents duplicate edges; the index lets either
 * side resolve in one query.
 */
import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { block } from './block.js';

export const blockDependency = pgTable(
  'block_dependency',
  {
    blockId: text('block_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    dependsOnId: text('depends_on_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.blockId, t.dependsOnId] }),
    reverseIdx: index('block_dependency_reverse_idx').on(t.dependsOnId),
  }),
);

export type BlockDependencyRow = typeof blockDependency.$inferSelect;
