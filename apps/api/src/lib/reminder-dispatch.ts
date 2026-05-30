/**
 * Reminder dispatch (PBI-68)。
 *
 * remind_at が過ぎた pending リマインダーを拾い、既存の notification インボックス
 * に 'reminder' として投入して status を 'sent' にする。本番は Cron Trigger
 * (apps/api/src/index.ts の scheduled) が全 WS を、dev / 手動は reminder.processDue
 * が自分の WS を処理する。
 *
 * 二重配信防止: status を pending→sent に条件付き update し、0 行（既に sent）なら
 * 通知を作らない。cron の重複起動でも冪等。
 */
import { and, eq, lte } from 'drizzle-orm';
import { ulid } from 'ulid';

import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';

export async function dispatchDueReminders(
  db: Database,
  opts: { workspaceId?: string; now?: Date } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const due = await db
    .select()
    .from(schema.reminder)
    .where(
      and(
        eq(schema.reminder.status, 'pending'),
        lte(schema.reminder.remindAt, now),
        opts.workspaceId ? eq(schema.reminder.workspaceId, opts.workspaceId) : undefined,
      ),
    )
    .limit(200);

  let sent = 0;
  for (const r of due) {
    await db.transaction(async (tx) => {
      // pending→sent を条件付きで奪取。0 行なら他で処理済み → 通知を作らない。
      const claimed = await tx
        .update(schema.reminder)
        .set({ status: 'sent' })
        .where(and(eq(schema.reminder.id, r.id), eq(schema.reminder.status, 'pending')))
        .returning({ id: schema.reminder.id });
      if (claimed.length === 0) return;
      await tx.insert(schema.notification).values({
        id: ulid(),
        workspaceId: r.workspaceId,
        recipientId: r.userId,
        actorUserId: r.userId,
        kind: 'reminder',
        blockId: r.blockId,
        body: r.body || 'リマインダー',
        createdAt: now,
      });
      sent += 1;
    });
  }
  return sent;
}
