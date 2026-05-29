/**
 * Workspace-level notification channel router (PBI-11).
 *
 * Slack incoming webhook の上書き保存と一覧。admin だけが触れる。
 * 1 ワークスペース 1 Slack を想定し、二重登録は upsert で抑える。
 */
import { and, eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { ulid } from 'ulid';
import { z } from 'zod';

import { db as schema } from '@synapse/schema';

import { assertCanAdmin, assertWorkspaceMember } from '../lib/access.js';
import { protectedProcedure, router } from '../trpc.js';

const workspaceInput = z.object({ workspaceId: z.string().min(1) });

export const notificationChannelRouter = router({
  list: protectedProcedure.input(workspaceInput).query(async ({ ctx, input }) => {
    await assertWorkspaceMember(ctx.db, input.workspaceId, ctx.session.user.id);
    const rows = await ctx.db
      .select()
      .from(schema.notificationChannel)
      .where(eq(schema.notificationChannel.workspaceId, input.workspaceId));
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      // webhook URL は秘匿性が高いので、prefix だけ返す（編集時はフルで上書き再入力）
      slackWebhookUrl: r.slackWebhookUrl ? `${r.slackWebhookUrl.slice(0, 28)}…` : null,
      emailTo: r.emailTo,
      kinds: r.kinds,
      enabled: r.enabled,
      updatedAt: r.updatedAt,
    }));
  }),

  /** Slack incoming webhook を保存（kind='slack' で 1 行）。 */
  setSlack: protectedProcedure
    .input(
      workspaceInput.extend({
        webhookUrl: z.string().url().startsWith('https://hooks.slack.com/'),
        kinds: z.array(z.string().min(1).max(40)).max(8).default([]),
        enabled: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertCanAdmin(ctx.db, input.workspaceId, ctx.session.user.id);
      const existing = (
        await ctx.db
          .select()
          .from(schema.notificationChannel)
          .where(
            and(
              eq(schema.notificationChannel.workspaceId, input.workspaceId),
              eq(schema.notificationChannel.kind, 'slack'),
            ),
          )
          .limit(1)
      )[0];
      if (existing) {
        await ctx.db
          .update(schema.notificationChannel)
          .set({
            slackWebhookUrl: input.webhookUrl,
            kinds: input.kinds,
            enabled: input.enabled,
            updatedAt: new Date(),
          })
          .where(eq(schema.notificationChannel.id, existing.id));
        return { id: existing.id };
      }
      const id = ulid();
      await ctx.db.insert(schema.notificationChannel).values({
        id,
        workspaceId: input.workspaceId,
        kind: 'slack',
        slackWebhookUrl: input.webhookUrl,
        kinds: input.kinds,
        enabled: input.enabled,
      });
      return { id };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const row = (
        await ctx.db
          .select()
          .from(schema.notificationChannel)
          .where(eq(schema.notificationChannel.id, input.id))
          .limit(1)
      )[0];
      if (!row) throw new TRPCError({ code: 'NOT_FOUND' });
      await assertCanAdmin(ctx.db, row.workspaceId, ctx.session.user.id);
      await ctx.db.delete(schema.notificationChannel).where(eq(schema.notificationChannel.id, input.id));
      return { ok: true };
    }),
});
