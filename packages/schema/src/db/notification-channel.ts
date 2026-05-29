/**
 * Workspace-level notification channel config (PBI-11).
 *
 * `notification_channel` 1 行 = 1 ワークスペース ＋ 1 配信先（slack / email）。
 * 当面 Slack webhook のみ実装。email は ADR + Resend 契約後の別 PBI。
 *
 * - `slackWebhookUrl` が non-empty で `enabled=true` のときに配信走る
 * - `mention` / `comment_reply` の kind を絞れるよう `kinds` を text[]
 *   で持っておく。空配列なら「全部」配信。
 */
import { index, pgTable, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { workspace } from './workspace.js';

export const NOTIFICATION_CHANNEL_KIND = ['slack', 'email'] as const;
export type NotificationChannelKind = (typeof NOTIFICATION_CHANNEL_KIND)[number];

export const notificationChannel = pgTable(
  'notification_channel',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(), // 'slack' | 'email'
    /** Slack incoming webhook URL（kind='slack' のとき必須）。 */
    slackWebhookUrl: text('slack_webhook_url'),
    /** Email digest 用の宛先（kind='email' のとき）。MVP では未実装。 */
    emailTo: text('email_to'),
    /** 配信したい通知 kind 一覧。空 = 全部。 */
    kinds: text('kinds').array().notNull().default(sql`'{}'::text[]`),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    wsIdx: index('notification_channel_ws_idx').on(t.workspaceId),
  }),
);

export type NotificationChannelRow = typeof notificationChannel.$inferSelect;
export type NewNotificationChannelRow = typeof notificationChannel.$inferInsert;
