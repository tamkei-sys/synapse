/**
 * PBI (Product Backlog Item) block.
 *
 * After P1 (大和心 model alignment) PBIs carry the full surface 大和心's
 * 🔵 PBI database uses: status, priority, Fibonacci estimate,
 * assignees, parent project / sprint references, dates, AI summary,
 * human-friendly auto-incremented id (`PBI-<n>`).
 *
 * The existing GitHub + CI surface from S5 / S10 stays as-is.
 */
import { z } from 'zod';

import { prioritySchema } from './project.js';

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

/**
 * CI status, fed by the GitHub `check_run` webhook and surfaced as a
 * badge on the PBI card (S10).
 */
export const pbiCiStatusSchema = z.object({
  conclusion: z
    .enum(['success', 'failure', 'neutral', 'cancelled', 'timed_out', 'action_required', 'skipped'])
    .nullable(),
  status: z.enum(['queued', 'in_progress', 'completed']),
  url: z.string().url().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type PbiCiStatus = z.infer<typeof pbiCiStatusSchema>;

/** Fibonacci story points — the same scale 大和心 uses on the PBI DB. */
export const PBI_ESTIMATES = [1, 2, 3, 5, 8, 13, 21] as const;
export type PbiEstimate = (typeof PBI_ESTIMATES)[number];
export const pbiEstimateSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
  z.literal(8),
  z.literal(13),
  z.literal(21),
]);

export const pbiPropsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: pbiStatusSchema.default('backlog'),
  priority: prioritySchema.default('should'),
  /** Fibonacci estimate (Notion-compatible). `storyPoints` stays as a
   * back-compat numeric mirror for surfaces that haven't migrated. */
  estimate: pbiEstimateSchema.optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  assigneeIds: z.array(z.string()).max(16).optional(),
  dueDate: z.string().date().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  /** Short AI-written summary; backs the Notion `AI 要約` column. */
  aiSummary: z.string().max(2_000).optional(),
  /** Human-friendly id `PBI-<n>`, allocated by entity_sequence. */
  number: z.number().int().positive().optional(),
  github: pbiGithubLinkSchema.optional(),
  ci: pbiCiStatusSchema.optional(),
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
