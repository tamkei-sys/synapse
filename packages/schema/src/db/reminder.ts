/**
 * Reminder (PBI-68).
 *
 * ユーザーが対象ページ (block) に対し remind_at の時刻に通知を受け取る予約。
 * スケジューラ（本番 Cron Trigger / dev は reminder.processDue）が due を拾い、
 * 既存の notification インボックスに 'reminder' として投入し status を 'sent' に
 * する。自分宛て（user_id = 設定者 = 通知先）。対象 block / workspace / user が
 * 消えれば cascade で予約も消える。
 */
import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { block } from './block.js';
import { workspace } from './workspace.js';

export const reminder = pgTable(
  'reminder',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    blockId: text('block_id')
      .notNull()
      .references(() => block.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    remindAt: timestamp('remind_at', { withTimezone: true }).notNull(),
    body: text('body').notNull().default(''),
    status: text('status').notNull().default('pending'), // 'pending' | 'sent'
    // 繰り返し (PBI-85): 'none' | 'daily' | 'weekly' | 'monthly'。none 以外は配信後に
    // 次回 remind_at を計算して pending のまま据え置く。
    recurrence: text('recurrence').notNull().default('none'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    dueIdx: index('reminder_due_idx').on(t.status, t.remindAt),
    userIdx: index('reminder_user_idx').on(t.userId, t.workspaceId),
  }),
);

export type ReminderRow = typeof reminder.$inferSelect;
export type NewReminderRow = typeof reminder.$inferInsert;
