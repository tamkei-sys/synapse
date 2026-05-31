/**
 * ゴミ箱の自動パージ (PBI-90)。
 *
 * deletedAt が閾値（既定 30 日）より古い page block を、子孫ページごと物理削除する。
 * 本番は Cron Trigger (index.ts の scheduled) が全 WS を、dev / 手動は
 * block.purgeOldTrash が自 WS を処理する（reminder と同じ seam）。
 */
import { and, eq, inArray, isNotNull, lt } from 'drizzle-orm';

import { db as schema } from '@synapse/schema';

import type { Database } from '../db.js';

const DEFAULT_RETENTION_DAYS = 30;

export async function purgeOldTrash(
  db: Database,
  opts: { workspaceId?: string; now?: Date; retentionDays?: number } = {},
): Promise<number> {
  const now = opts.now ?? new Date();
  const days = opts.retentionDays ?? DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(now.getTime() - days * 86_400_000);

  // 閾値より古い削除済み page（ルート群）を拾う。
  const roots = await db
    .select({ id: schema.block.id })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.type, 'page'),
        isNotNull(schema.block.deletedAt),
        lt(schema.block.deletedAt, cutoff),
        opts.workspaceId ? eq(schema.block.workspaceId, opts.workspaceId) : undefined,
      ),
    )
    .limit(500);
  if (roots.length === 0) return 0;

  // 子孫ページも含めて物理削除（purgePage と同じ BFS）。
  const ids = roots.map((r) => r.id);
  let frontier = [...ids];
  for (let depth = 0; depth < 64 && frontier.length > 0; depth++) {
    const children = await db
      .select({ id: schema.block.id })
      .from(schema.block)
      .where(and(inArray(schema.block.parentId, frontier), eq(schema.block.type, 'page')));
    frontier = children.map((c) => c.id).filter((id) => !ids.includes(id));
    ids.push(...frontier);
  }
  await db.delete(schema.block).where(inArray(schema.block.id, ids));
  return ids.length;
}
