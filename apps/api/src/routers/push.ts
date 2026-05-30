/**
 * Web Push subscription router (scaffold).
 *
 * PBI-28: ベル音は実装済み（クライアントの Web Audio API）。Web Push の
 * 実配信は VAPID 鍵 + service worker + web-push ライブラリのバンドルが
 * 揃ってから別 PBI（PBI-11 を兼ねる予定）で着地。
 *
 * ここで提供するのは subscribe / unsubscribe / list の薄い RPC だけ。
 * 配信ロジック側は別途 push_subscription を SELECT して webPush.sendNotification
 * を叩く formula を書く。
 *
 * subscribe は upsert（同じ endpoint がきたら最新化）。endpoint は
 * unique index で守られている。
 */
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { ulid } from 'ulid';

import { protectedProcedure, router } from '../trpc.js';

const subscribeInput = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().max(500).optional(),
});

export const pushRouter = router({
  /** クライアントの sw.js が PushSubscription.toJSON() を送ってくる想定。 */
  subscribe: protectedProcedure.input(subscribeInput).mutation(async ({ ctx, input }) => {
    const userId = ctx.session.user.id;
    const id = ulid();
    await ctx.db
      .insert(schema.pushSubscription)
      .values({
        id,
        userId,
        endpoint: input.endpoint,
        p256dhKey: input.keys.p256dh,
        authKey: input.keys.auth,
        userAgent: input.userAgent,
      })
      .onConflictDoUpdate({
        target: schema.pushSubscription.endpoint,
        set: {
          userId,
          p256dhKey: input.keys.p256dh,
          authKey: input.keys.auth,
          userAgent: input.userAgent,
          lastSeenAt: sql`now()`,
        },
      });
    return { ok: true };
  }),

  /** endpoint を捨てる。クライアントが unsubscribe したとき / 配信側が 410 を観測したとき。 */
  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(schema.pushSubscription)
        .where(eq(schema.pushSubscription.endpoint, input.endpoint));
      return { ok: true };
    }),

  /** 自分の subscription を一覧（設定画面用のスタブ）。 */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: schema.pushSubscription.id,
        endpoint: schema.pushSubscription.endpoint,
        userAgent: schema.pushSubscription.userAgent,
        createdAt: schema.pushSubscription.createdAt,
      })
      .from(schema.pushSubscription)
      .where(eq(schema.pushSubscription.userId, ctx.session.user.id));
    return rows;
  }),
});
