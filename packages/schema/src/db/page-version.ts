/**
 * Page version history (PBI-54).
 *
 * ページ本文の過去スナップショット（ProseMirror JSON）。sync の保存フックが
 * レート制限付きで 'auto' 版を、ユーザーの「現在を保存」が 'manual' 版を積む。
 * 復元はクライアントが doc を取り出して editor.setContent するため、Yjs バイナリ
 * state ではなく doc(JSON) のみ保持する。block が消えれば cascade で版も消える。
 * created_by は手動版のみ（自動版は誰の編集か特定できないので null）。
 */
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { block } from './block.js';
import { workspace } from './workspace.js';

export const pageVersion = pgTable(
  'page_version',
  {
    id: text('id').primaryKey(),
    blockId: text('block_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    doc: jsonb('doc').notNull(),
    kind: text('kind').notNull(), // 'auto' | 'manual'
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    blockCreatedIdx: index('page_version_block_created_idx').on(t.blockId, t.createdAt),
  }),
);

export type PageVersionRow = typeof pageVersion.$inferSelect;
export type NewPageVersionRow = typeof pageVersion.$inferInsert;
