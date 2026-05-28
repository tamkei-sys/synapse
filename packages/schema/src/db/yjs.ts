/**
 * Per-block Yjs binary state.
 *
 * Yjs documents grow unbounded with edit history, so they live in their
 * own table — never inlined into `block.props`. The relationship is 1:1
 * with a `page` block today; future block types (sheet, sub-page) can
 * reuse the same row by sharing the block id.
 *
 * Hocuspocus calls `fetch` once per connection to hydrate, and `store`
 * after a quiet period of edits.
 */
import { customType, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { block } from './block.js';

// drizzle-orm/pg-core doesn't ship a bytea helper yet; spell it out.
const bytea = customType<{ data: Uint8Array; default: false }>({
  dataType() {
    return 'bytea';
  },
  fromDriver(value): Uint8Array {
    if (value instanceof Uint8Array) return value;
    if (Buffer.isBuffer(value)) return new Uint8Array(value);
    throw new Error(`Unexpected bytea driver value: ${typeof value}`);
  },
  toDriver(value: Uint8Array): Buffer {
    return Buffer.from(value);
  },
});

export const blockYjsState = pgTable('block_yjs_state', {
  blockId: text('block_id')
    .primaryKey()
    .references(() => block.id, { onDelete: 'cascade' }),
  state: bytea('state').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BlockYjsStateRow = typeof blockYjsState.$inferSelect;
export type NewBlockYjsStateRow = typeof blockYjsState.$inferInsert;
