/**
 * Page link / backlink index (PBI-73).
 *
 * ドキュメント本文に埋まった `pageRef`（@page 参照）を sync の保存フックが
 * 索引化したもの。`sourceId` のページが `targetId` のページを参照している、
 * という有向辺。バックリンク（被参照）は `targetId` で逆引きする。
 *
 * (sourceId, targetId) で 1 行（同一ページへの複数参照は 1 本に畳む）。
 * どちらの block が消えても cascade で辺を消す。
 */
import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { block } from './block.js';

export const pageLink = pgTable(
  'page_link',
  {
    sourceId: text('source_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    targetId: text('target_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    workspaceId: text('workspace_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.sourceId, t.targetId] }),
    targetIdx: index('page_link_target_idx').on(t.targetId),
  }),
);

export type PageLinkRow = typeof pageLink.$inferSelect;
export type NewPageLinkRow = typeof pageLink.$inferInsert;
