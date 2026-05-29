/**
 * Web Push subscription.
 *
 * PWA / ブラウザの Service Worker から `pushManager.subscribe()` で得た
 * `PushSubscription` を保管しておくテーブル。配信側（VAPID + web-push
 * ライブラリ）は別 PBI で着地予定 (CLAUDE.md §3 にあるとおり ADR 待ち)。
 *
 * - endpoint をユニークキーにする（同じ subscription を 2 回登録しない）。
 * - keys は p256dh / auth の 2 値だけなので jsonb ではなく独立 column。
 *   ペイロード暗号化に必須なので NOT NULL。
 * - 未来の SSO で同じ user が 複数デバイス持ちうるので user 1: N。
 *
 * `last_seen_at` は配信失敗 (404 / 410) を観測したら null クリアして、
 * クリーンアップ batch で older than 30 days を削除する想定。
 */
import { index, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { user } from './auth.js';

export const pushSubscription = pgTable(
  'push_subscription',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull(),
    p256dhKey: text('p256dh_key').notNull(),
    authKey: text('auth_key').notNull(),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('push_subscription_user_idx').on(t.userId),
    endpointUnique: uniqueIndex('push_subscription_endpoint_uniq').on(t.endpoint),
  }),
);

export type PushSubscriptionRow = typeof pushSubscription.$inferSelect;
export type NewPushSubscriptionRow = typeof pushSubscription.$inferInsert;
