/**
 * Page favorite (PBI-53).
 *
 * ユーザーごとのお気に入りページ。(userId, pageId) で 1 行。Sidebar の
 * 「お気に入り」セクションに出す。block (page) が消えたら cascade で消す。
 */
import { index, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { block } from './block.js';

export const pageFavorite = pgTable(
  'page_favorite',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    pageId: text('page_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.pageId] }),
    userIdx: index('page_favorite_user_idx').on(t.userId),
  }),
);

export type PageFavoriteRow = typeof pageFavorite.$inferSelect;
export type NewPageFavoriteRow = typeof pageFavorite.$inferInsert;
