/**
 * Inbound: GitHub Issue events → PBI updates.
 *
 * S5 handles the `issues` event family only:
 *   - `opened`   noop unless the PBI was already linked (we don't
 *                auto-create PBIs in this direction — that'd let
 *                anyone with a repo write into our workspaces)
 *   - `edited`   sync title
 *   - `closed`   set state='closed', map PBI status → done
 *   - `reopened` set state='open', map back to backlog if PBI was done
 *
 * The match key is `(owner, repo, issueNumber)`. Without a dedicated
 * index we scan via jsonb `->>` — fine at S5 volumes; a partial index
 * lands when the table grows.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';

import {
  issueStateToStatus,
  pbiPropsSchema,
  type PbiGithubLink,
  type PbiStatus,
} from '@synapse/blocks';
import { db as schema } from '@synapse/schema';

import type { Database } from '../../db.js';
import { atomicPropsMerge } from '../../lib/props-merge.js';

export type IssuesEventPayload = {
  action: string;
  issue: {
    number: number;
    title: string;
    state: 'open' | 'closed';
    html_url?: string;
  };
  repository: {
    name: string;
    owner: { login: string };
  };
};

type ApplyResult = { ok: true; applied: 'updated' | 'noop' } | { ok: false; reason: string };

export async function applyIssuesEvent(
  db: Database,
  payload: IssuesEventPayload,
): Promise<ApplyResult> {
  const { action, issue, repository } = payload;
  if (!['opened', 'edited', 'closed', 'reopened'].includes(action)) {
    return { ok: true, applied: 'noop' };
  }
  const owner = repository.owner.login;
  const repo = repository.name;
  const issueNumber = issue.number;

  const candidates = await db
    .select({
      id: schema.block.id,
      props: schema.block.props,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.type, 'pbi'),
        isNull(schema.block.deletedAt),
        sql`(props->'github'->>'owner') = ${owner}`,
        sql`(props->'github'->>'repo') = ${repo}`,
        sql`(props->'github'->>'issueNumber')::int = ${issueNumber}`,
      ),
    );

  if (candidates.length === 0) return { ok: true, applied: 'noop' };

  for (const row of candidates) {
    const current = (row.props ?? {}) as Record<string, unknown>;
    const link = current['github'] as PbiGithubLink | undefined;
    if (!link) continue; // shouldn't happen given the where clause

    const nextLink: PbiGithubLink = {
      ...link,
      state: issue.state,
      syncedAt: new Date().toISOString(),
    };

    const currentStatus = (current['status'] as PbiStatus | undefined) ?? 'backlog';
    const nextStatus = issueStateToStatus(issue.state, currentStatus);

    const nextTitle =
      action === 'edited' || action === 'opened'
        ? issue.title.trim().slice(0, 200) || (current['title'] as string)
        : (current['title'] as string);

    const setEntries = {
      title: nextTitle,
      status: nextStatus,
      github: nextLink,
    };
    // 検証ゲート（書き込みには使わない）。既存 props が壊れていればここで止まる。
    pbiPropsSchema.parse({ ...current, ...setEntries });

    // 書き込みは 3 キーだけの単一 UPDATE 文の jsonb マージ。全量書き戻しは
    // webhook 配送遅延の窓で UI / MCP の並行更新（estimate / aiSummary 等）を
    // 巻き戻す lost update になる（apps/api/src/lib/props-merge.ts 参照）。
    await db
      .update(schema.block)
      .set({
        props: atomicPropsMerge({ set: setEntries }),
        version: sql`${schema.block.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.block.id, row.id));
  }

  return { ok: true, applied: 'updated' };
}
