/**
 * 外部チャネル（Slack / Email）への通知配信 (PBI-11)。
 *
 * - 呼び出し元は `executionCtx.waitUntil(deliverNotification(...))` で
 *   レスポンスを待たせない。
 * - 失敗は audit_log にだけ書く。throw しない。
 * - Slack: incoming webhook に POST。SDK は使わず fetch。本文は単純テキスト。
 * - Email: 今は no-op（ADR + Resend / Postmark 契約後に別 PBI）。
 */
import { and, eq } from 'drizzle-orm';

import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';
import type { Env } from '../env.js';

type NotifyPayload = {
  workspaceId: string;
  kind: string;
  recipientUserId: string;
  actorName: string;
  body: string;
  /** クリック先 URL（任意）。 */
  url?: string;
};

export async function deliverNotification(
  db: Database,
  env: Env,
  payload: NotifyPayload,
): Promise<void> {
  try {
    const channels = await db
      .select()
      .from(schema.notificationChannel)
      .where(
        and(
          eq(schema.notificationChannel.workspaceId, payload.workspaceId),
          eq(schema.notificationChannel.enabled, true),
        ),
      );

    await Promise.all(
      channels.map(async (ch) => {
        // kinds が空 = 全 kind 配信
        if (ch.kinds.length > 0 && !ch.kinds.includes(payload.kind)) return;
        if (ch.kind === 'slack' && ch.slackWebhookUrl) {
          await sendSlack(ch.slackWebhookUrl, payload).catch((e) => logFailure('slack', e));
        }
        // email は MVP では未実装（ADR + provider 契約後）。
      }),
    );
  } catch (err) {
    // SELECT 自体が失敗するとここに来る。本体動作は壊さない。
    logFailure('delivery', err);
  }
  // eslint で env 未使用警告を抑える（将来 EMAIL provider key を読む）。
  void env;
  void db;
}

async function sendSlack(webhookUrl: string, payload: NotifyPayload): Promise<void> {
  const text =
    `*${payload.actorName}* — ${payload.body}` + (payload.url ? `\n<${payload.url}>` : '');
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    throw new Error(`slack webhook ${res.status}`);
  }
}

function logFailure(channel: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  // audit_log は actor 必須 + 「ツール呼出し」の意味論なのでここでは使えない。
  // Workers のログにだけ落とす（CLAUDE.md: scripts/feature コードでは
  // console.warn は許可）。
  console.warn(`[notify-deliver] ${channel} failed:`, message);
}
