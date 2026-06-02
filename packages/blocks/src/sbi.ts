/**
 * SBI (Sprint Backlog Item) — concrete task under a PBI, sized in hours
 * rather than story points. Mirrors 大和心's 🟢 SBI database.
 *
 * Status flow: todo → in_progress → review → done (→ archived).
 * Includes reviewer + approved reviewer fields so SBIs carry the
 * lightweight code-review lifecycle 大和心 runs on top of GitHub PRs.
 *
 * Alerts (`alert1` / `alert2`) in Notion are formula-derived;
 * we recompute them client-side from estimateHours / actualHours and
 * the start time. The shape here just lets the props round-trip.
 */
import { z } from 'zod';

export const SBI_STATUSES = ['todo', 'in_progress', 'review', 'done', 'archived'] as const;
export type SbiStatus = (typeof SBI_STATUSES)[number];

export const sbiStatusSchema = z.enum(SBI_STATUSES);

export const sbiPropsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: sbiStatusSchema.default('todo'),
  assigneeId: z.string().optional(),
  reviewerIds: z.array(z.string()).max(8).optional(),
  approvedReviewerIds: z.array(z.string()).max(8).optional(),
  estimateHours: z.number().min(0).max(200).optional(),
  actualHours: z.number().min(0).max(2000).optional(),
  dueDate: z.string().date().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  /** Parent PBI block id — required. */
  pbiId: z.string().min(1),
  /** Human-friendly id `SBI-<n>`. */
  number: z.number().int().positive().optional(),
});

export type SbiProps = z.infer<typeof sbiPropsSchema>;

export const SBI_STATUS_ORDER: readonly SbiStatus[] = [...SBI_STATUSES];

export function nextSbiStatus(s: SbiStatus): SbiStatus {
  const idx = SBI_STATUS_ORDER.indexOf(s);
  const next = SBI_STATUS_ORDER[(idx + 1) % SBI_STATUS_ORDER.length];
  if (!next) throw new Error('unreachable: SBI_STATUS_ORDER empty');
  return next;
}

/**
 * Did the SBI exceed its estimate? Mirrors Notion's `アラート1`.
 * Returns null when there isn't enough data to decide.
 */
export function isOverEstimate(p: Pick<SbiProps, 'estimateHours' | 'actualHours'>): boolean | null {
  if (typeof p.estimateHours !== 'number' || typeof p.actualHours !== 'number') return null;
  return p.actualHours > p.estimateHours;
}

/**
 * Has the SBI been "in progress" too long? CLAUDE.md project guidance
 * caps a single SBI at 3 person-days; 4+ in progress is the threshold.
 * Mirrors Notion's `アラート2`.
 */
export function isStale(
  p: Pick<SbiProps, 'status' | 'startedAt'>,
  now: Date = new Date(),
  threshold = 4 * 24 * 60 * 60 * 1000,
): boolean | null {
  if (p.status !== 'in_progress' || !p.startedAt) return null;
  const started = Date.parse(p.startedAt);
  if (Number.isNaN(started)) return null;
  return now.getTime() - started > threshold;
}

/**
 * 着手からの経過日数。Notion の `経過日数` 相当を client 側で再計算する。
 * 進行中は now まで、完了済みは completedAt まで（実所要日数）で測る。
 * startedAt が無い（未着手）場合は null。
 */
export function elapsedDays(
  p: Pick<SbiProps, 'startedAt' | 'completedAt'>,
  now: Date = new Date(),
): number | null {
  if (!p.startedAt) return null;
  const started = Date.parse(p.startedAt);
  if (Number.isNaN(started)) return null;
  const end = p.completedAt ? Date.parse(p.completedAt) : now.getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.floor((end - started) / (24 * 60 * 60 * 1000)));
}
