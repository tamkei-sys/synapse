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

    const next = {
      ...current,
      title: nextTitle,
      status: nextStatus,
      github: nextLink,
    };
    const validated = pbiPropsSchema.parse(next);

    await db
      .update(schema.block)
      .set({
        props: validated,
        version: sql`${schema.block.version} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(schema.block.id, row.id));
  }

  return { ok: true, applied: 'updated' };
}
