/**
 * Inbound: GitHub `check_run` events → PBI ci status.
 *
 * Match by repository + head_branch's linked PR... S10 simplifies: we
 * match by repository against any PBI linked to ANY issue in that repo.
 * That's coarse — once we track PR↔PBI links explicitly, the match key
 * narrows. The CI badge surface is identical in both cases.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';

import { pbiPropsSchema, type PbiCiStatus } from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import type { Database } from '../../db.js';
import { atomicPropsMerge } from '../../lib/props-merge.js';

export type CheckRunEventPayload = {
  action: 'created' | 'completed' | 'rerequested' | 'requested_action';
  check_run: {
    status: 'queued' | 'in_progress' | 'completed';
    conclusion:
      | 'success'
      | 'failure'
      | 'neutral'
      | 'cancelled'
      | 'timed_out'
      | 'action_required'
      | 'skipped'
      | null;
    html_url?: string;
  };
  repository: {
    name: string;
    owner: { login: string };
  };
};

export async function applyCheckRunEvent(
  db: Database,
  payload: CheckRunEventPayload,
): Promise<{ ok: true; applied: 'updated' | 'noop' }> {
  const owner = payload.repository.owner.login;
  const repo = payload.repository.name;
  const candidates = await db
    .select({ id: schema.block.id, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.type, 'pbi'),
        isNull(schema.block.deletedAt),
        sql`(props->'github'->>'owner') = ${owner}`,
        sql`(props->'github'->>'repo') = ${repo}`,
      ),
    );
  if (candidates.length === 0) return { ok: true, applied: 'noop' };

  const ci: PbiCiStatus = {
    status: payload.check_run.status,
    conclusion: payload.check_run.conclusion,
    ...(payload.check_run.html_url ? { url: payload.check_run.html_url } : {}),
    updatedAt: new Date().toISOString(),
  };

  for (const row of candidates) {
    const current = (row.props ?? {}) as Record<string, unknown>;
    // 検証ゲート（書き込みには使わない）。書き込みは ci キーだけの原子マージ —
    // 全量書き戻しは並行する PBI 更新を巻き戻す（apps/api/src/lib/props-merge.ts）。
    pbiPropsSchema.parse({ ...current, ci });
    await db
      .update(schema.block)
      .set({
        props: atomicPropsMerge({ set: { ci } }),
        version: sql`${schema.block.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.block.id, row.id));
  }
  return { ok: true, applied: 'updated' };
}
