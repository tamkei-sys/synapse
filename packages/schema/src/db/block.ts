/**
 * Block table — the single primitive backing pages, PBIs, paragraphs, sheet
 * cells, and so on. Mirrors docs/design.md §5.
 *
 * The `type` column governs how `props` is interpreted; Zod schemas in
 * @synapse/blocks discriminate on it.
 */
import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { workspace } from './workspace.js';

export const block = pgTable(
  'block',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    type: text('type').notNull(), // see BlockType in @synapse/blocks
    position: text('position').notNull(), // fractional indexing (LexoRank-style)
    props: jsonb('props').notNull().default({}),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    version: integer('version').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    workspaceIdx: index('block_workspace_idx').on(t.workspaceId),
    parentIdx: index('block_parent_idx').on(t.parentId),
    typeIdx: index('block_type_idx').on(t.workspaceId, t.type),
    // Position is unique within a parent (so reorder always gets a fresh slot).
    siblingPosUidx: uniqueIndex('block_sibling_pos_uidx').on(t.parentId, t.position),
  }),
);

export type BlockRow = typeof block.$inferSelect;
export type NewBlockRow = typeof block.$inferInsert;
