/**
 * Notification table.
 *
 * 受信者 (recipientId) ごとに 1 行ずつ蓄積するシンプルなインボックス。
 * kind は当面 'mention' のみだが、将来 'assigned' / 'status_changed' /
 * 'comment_reply' を追加できるよう text のまま緩く持つ。
 *
 * - blockId : 通知のクリック先（任意）。FK は no cascade（block が
 *   soft delete されても通知本体は履歴として残す）。
 * - commentId : 通知の発生元コメント（任意）。同じく cascade しない。
 * - body    : 通知一覧で見える短文（差出人 + 動作 + 簡易抜粋）。
 *
 * インデックス：未読数取得を頻繁に行うので (recipientId, workspaceId,
 * readAt) を共通に持つ。
 */
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { workspace } from './workspace.js';

export const notification = pgTable(
  'notification',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    recipientId: text('recipient_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => user.id),
    kind: text('kind').notNull(),
    blockId: text('block_id'),
    commentId: text('comment_id'),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true }),
  },
  (t) => ({
    inboxIdx: index('notification_inbox_idx').on(t.recipientId, t.workspaceId, t.createdAt),
  }),
);

export type NotificationRow = typeof notification.$inferSelect;
export type NewNotificationRow = typeof notification.$inferInsert;
