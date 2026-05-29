/**
 * Notification router.
 *
 * 受信者本人のみが自分の通知を read / mark-read できる。actor や workspace
 * メンバーは他人の通知に絶対触れない（router 内で recipientId を session
 * の userId に固定）。
 *
 * 未読数は polling で頻繁に呼ぶので index (recipient, workspace, createdAt)
 * を効かせる。
 */
import { TRPCError } from '@trpc/server';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

export const notificationRouter = router({
  /** 受信者本人の最近の通知（既定 30 件）。kind フィルタは未指定で全種別。 */
  list: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().min(1),
        limit: z.number().int().min(1).max(100).default(30),
        unreadOnly: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);

      const baseWhere = and(
        eq(schema.notification.workspaceId, input.workspaceId),
        eq(schema.notification.recipientId, ctx.session.user.id),
        input.unreadOnly ? isNull(schema.notification.readAt) : undefined,
      );

      return ctx.db
        .select({
          id: schema.notification.id,
          kind: schema.notification.kind,
          body: schema.notification.body,
          blockId: schema.notification.blockId,
          commentId: schema.notification.commentId,
          createdAt: schema.notification.createdAt,
          readAt: schema.notification.readAt,
          actorUserId: schema.notification.actorUserId,
          actorName: schema.user.name,
          actorImage: schema.user.image,
        })
        .from(schema.notification)
        .innerJoin(schema.user, eq(schema.notification.actorUserId, schema.user.id))
        .where(baseWhere)
        .orderBy(desc(schema.notification.createdAt))
        .limit(input.limit);
    }),

  /** 未読数だけが欲しいときの軽量プロシージャ。ベルバッジで polling する。 */
  unreadCount: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const [row] = await ctx.db
        .select({ value: count() })
        .from(schema.notification)
        .where(
          and(
            eq(schema.notification.workspaceId, input.workspaceId),
            eq(schema.notification.recipientId, ctx.session.user.id),
            isNull(schema.notification.readAt),
          ),
        );
      return { count: row?.value ?? 0 };
    }),

  /** 1 件既読化。recipient が本人であることを where 句で強制。 */
  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(schema.notification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(schema.notification.id, input.notificationId),
            eq(schema.notification.recipientId, ctx.session.user.id),
            isNull(schema.notification.readAt),
          ),
        )
        .returning({ id: schema.notification.id });
      if (result.length === 0) {
        // 他人の通知 or 既読 or 存在しない → サイレントに ok 扱いでも良いが
        // クライアントに「もう既読」と伝えるため NOT_FOUND を返す。
        throw new TRPCError({ code: 'NOT_FOUND' });
      }
      return { ok: true };
    }),

  /** workspace 内の未読を一括既読化。 */
  markAllRead: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const updated = await ctx.db
        .update(schema.notification)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(schema.notification.workspaceId, input.workspaceId),
            eq(schema.notification.recipientId, ctx.session.user.id),
            isNull(schema.notification.readAt),
          ),
        )
        .returning({ id: schema.notification.id });
      return { updated: updated.length };
    }),
});
