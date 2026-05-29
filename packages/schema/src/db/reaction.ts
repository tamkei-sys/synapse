/**
 * Comment reaction.
 *
 * 1 user × 1 emoji × 1 comment で複合主キー。同じ組合せは存在しない。
 * Cascade on comment（= block）削除と user 削除で自動消滅。
 */
import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { block } from './block.js';

export const commentReaction = pgTable(
  'comment_reaction',
  {
    commentId: text('comment_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.commentId, t.userId, t.emoji] }),
  }),
);

export type CommentReactionRow = typeof commentReaction.$inferSelect;
