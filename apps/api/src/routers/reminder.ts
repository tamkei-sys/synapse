/**
 * Reminder router (PBI-68)。
 *
 * ページ (block) に対する自分宛てリマインダーの作成 / 一覧 / 削除と、due を即時
 * 処理する processDue（dev / 手動用。本番は Cron Trigger が全 WS を dispatch する）。
 * 通知は既存の notification インボックスに 'reminder' kind で届く。
 */
import { TRPCError } from '@trpc/server';
import { and, asc, eq } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertWorkspaceMember } from '../lib/access.js';
import { dispatchDueReminders } from '../lib/reminder-dispatch.js';
import { protectedProcedure, router } from '../trpc.js';

export const reminderRouter = router({
  /** 対象ページに自分宛てリマインダーを作成する。 */
  create: protectedProcedure
    .input(
      z.object({
        blockId: z.string().min(1),
        remindAt: z.coerce.date(),
        body: z.string().max(500).default(''),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const [block] = await ctx.db
        .select({ workspaceId: schema.block.workspaceId })
        .from(schema.block)
        .where(eq(schema.block.id, input.blockId))
        .limit(1);
      if (!block) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertWorkspaceMember(ctx.db, block.workspaceId, userId);
      const id = ulid();
      await ctx.db.insert(schema.reminder).values({
        id,
        workspaceId: block.workspaceId,
        blockId: input.blockId,
        userId,
        remindAt: input.remindAt,
        body: input.body,
        status: 'pending',
      });
      return { id };
    }),

  /** 自分のリマインダー一覧（remind_at 昇順）。blockId 指定でそのページ分のみ。 */
  listMine: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1), blockId: z.string().min(1).optional() }))
    .query(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      return ctx.db
        .select({
          id: schema.reminder.id,
          blockId: schema.reminder.blockId,
          remindAt: schema.reminder.remindAt,
          body: schema.reminder.body,
          status: schema.reminder.status,
        })
        .from(schema.reminder)
        .where(
          and(
            eq(schema.reminder.workspaceId, input.workspaceId),
            eq(schema.reminder.userId, ctx.session.user.id),
            input.blockId ? eq(schema.reminder.blockId, input.blockId) : undefined,
          ),
        )
        .orderBy(asc(schema.reminder.remindAt))
        .limit(100);
    }),

  /** 自分のリマインダーを削除（キャンセル）。 */
  delete: protectedProcedure
    .input(z.object({ reminderId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(schema.reminder)
        .where(
          and(
            eq(schema.reminder.id, input.reminderId),
            eq(schema.reminder.userId, ctx.session.user.id),
          ),
        )
        .returning({ id: schema.reminder.id });
      if (result.length === 0) throw new TRPCError({ code: 'NOT_FOUND' });
      return { ok: true };
    }),

  /**
   * due なリマインダーを今すぐ処理する（自分の WS のみ）。本番は Cron Trigger が
   * 全 WS を dispatch するが、dev には cron が無いので手動 / E2E 用に公開する。
   */
  processDue: protectedProcedure
    .input(z.object({ workspaceId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
      const sent = await dispatchDueReminders(ctx.db, { workspaceId: input.workspaceId });
      return { sent };
    }),
});
