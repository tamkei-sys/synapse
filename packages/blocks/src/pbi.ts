/**
 * PBI (Product Backlog Item) block — a top-level workspace item that
 * tracks one piece of deliverable work.
 *
 * Mirrors docs/design.md §5 but in S4 ships a deliberately narrow subset:
 *   - title, status, storyPoints
 * Later sprints add: assigneeIds, sprintId, epicId, acceptanceCriteria,
 *                    linkedDocs, linkedPRs, github, claudeCode.
 */
import { z } from 'zod';

export const PBI_STATUSES = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const;
export type PbiStatus = (typeof PBI_STATUSES)[number];

/** Status ordered for the Kanban board and for next-state cycling. */
export const PBI_STATUS_ORDER: readonly PbiStatus[] = [
  'backlog',
  'ready',
  'in_progress',
  'review',
  'done',
];

export const pbiStatusSchema = z.enum(PBI_STATUSES);

/**
 * GitHub linkage for a PBI.
 *
 * Stored under `props.github` so a PBI can carry zero or one linked
 * Issue without a separate join table — the join table arrives in
 * S5+ once we need to enforce uniqueness across workspaces or
 * search by `(owner,repo,issueNumber)` at index speed.
 */
export const pbiGithubLinkSchema = z.object({
  owner: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[A-Za-z0-9][A-Za-z0-9-]*$/, 'invalid github owner'),
  repo: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9._-]+$/, 'invalid github repo'),
  issueNumber: z.number().int().positive(),
  /** Mirrored from the issue itself when GitHub pings us. */
  state: z.enum(['open', 'closed']).optional(),
  /** ISO timestamp, last time the link was updated either way. */
  syncedAt: z.string().datetime().optional(),
});

export type PbiGithubLink = z.infer<typeof pbiGithubLinkSchema>;

/** PBI status ↔ GitHub Issue state mapping (rough but useful S5 default). */
export function statusToIssueState(s: PbiStatus): 'open' | 'closed' {
  return s === 'done' ? 'closed' : 'open';
}

export function issueStateToStatus(state: 'open' | 'closed', current: PbiStatus): PbiStatus {
  if (state === 'closed') return 'done';
  // Re-opening a closed issue should pull the PBI back into the board,
  // but only if the local state had reached 'done' — otherwise we'd
  // wipe local progress like 'in_progress'.
  if (state === 'open' && current === 'done') return 'backlog';
  return current;
}

export const pbiPropsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: pbiStatusSchema.default('backlog'),
  storyPoints: z.number().int().min(0).max(100).optional(),
  github: pbiGithubLinkSchema.optional(),
});

export type PbiProps = z.infer<typeof pbiPropsSchema>;

/** Next status in the Kanban cycle. Wraps from `done` back to `backlog`. */
export function nextStatus(s: PbiStatus): PbiStatus {
  const idx = PBI_STATUS_ORDER.indexOf(s);
  const next = PBI_STATUS_ORDER[(idx + 1) % PBI_STATUS_ORDER.length];
  // PBI_STATUS_ORDER is non-empty, so this branch is unreachable. The
  // explicit guard keeps `noUncheckedIndexedAccess` happy.
  if (!next) throw new Error('unreachable: PBI_STATUS_ORDER empty');
  return next;
}
