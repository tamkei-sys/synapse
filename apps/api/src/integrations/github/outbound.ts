/**
 * Outbound: push local PBI changes to a linked GitHub Issue.
 *
 * Called fire-and-forget from `pbi.update` — we never block the tRPC
 * response on a network round-trip to GitHub (CLAUDE.md §6: handler
 * latency budget is 100ms). Failures only warn; the next status flip
 * retries naturally.
 *
 * Dev mode (no `GITHUB_TOKEN`) skips the actual fetch with a single
 * console line so reviewers can see the integration is wired.
 */
import { statusToIssueState, type PbiStatus, type PbiGithubLink } from '@synapse/blocks';

import type { Env } from '../../env.js';

type PbiSnapshot = {
  title: string;
  status: PbiStatus;
  github: PbiGithubLink | undefined;
};

const DEFAULT_API_BASE = 'https://api.github.com';

export async function pushPbiToGithub(env: Env, pbi: PbiSnapshot): Promise<void> {
  if (!pbi.github) return;
  if (!env.GITHUB_TOKEN) {
    console.warn(
      `[github] skipping push for ${pbi.github.owner}/${pbi.github.repo}#${pbi.github.issueNumber}: GITHUB_TOKEN not set`,
    );
    return;
  }

  const base = env.GITHUB_API_BASE ?? DEFAULT_API_BASE;
  const url = `${base}/repos/${pbi.github.owner}/${pbi.github.repo}/issues/${pbi.github.issueNumber}`;
  const body = {
    title: pbi.title,
    state: statusToIssueState(pbi.status),
  };

  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        accept: 'application/vnd.github+json',
        'content-type': 'application/json',
        authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'user-agent': 'synapse-api',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[github] PATCH ${url} failed (${res.status}): ${text.slice(0, 200)}`);
    }
  } catch (err) {
    console.warn(`[github] PATCH ${url} threw:`, err);
  }
}
