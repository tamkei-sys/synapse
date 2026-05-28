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

export const pbiPropsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: pbiStatusSchema.default('backlog'),
  storyPoints: z.number().int().min(0).max(100).optional(),
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
