/**
 * Project block — the top container that holds 1..N PBIs (which in turn
 * hold 1..N SBIs). Mirrors 大和心's 🔴 プロジェクト database.
 *
 * Status ordered set is the 8-state lifecycle the team uses:
 *   backlog → planned → in_progress → paused / review → done → cancelled
 *   → archived
 *
 * Priority mirrors MoSCoW (Must / Should / Could / Won't) named with the
 * 4 labels 大和心 uses: 必須 / 推奨 / 可能 / 先送り.
 */
import { z } from 'zod';

export const PROJECT_STATUSES = [
  'backlog',
  'planned',
  'in_progress',
  'paused',
  'review',
  'done',
  'cancelled',
  'archived',
] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PRIORITIES = ['must', 'should', 'could', 'wont'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export const prioritySchema = z.enum(PRIORITIES);

export const projectPropsSchema = z.object({
  name: z.string().trim().min(1).max(200),
  status: projectStatusSchema.default('backlog'),
  priority: prioritySchema.default('should'),
  ownerId: z.string().optional(),
  startDate: z.string().date().optional(),
  plannedDate: z.string().date().optional(),
  completedDate: z.string().date().optional(),
  /** Human-friendly id `PRJ-<n>`, allocated by entity_sequence on create. */
  number: z.number().int().positive().optional(),
});

export type ProjectProps = z.infer<typeof projectPropsSchema>;

export const PROJECT_STATUS_ORDER: readonly ProjectStatus[] = [...PROJECT_STATUSES];

export function nextProjectStatus(s: ProjectStatus): ProjectStatus {
  const idx = PROJECT_STATUS_ORDER.indexOf(s);
  const next = PROJECT_STATUS_ORDER[(idx + 1) % PROJECT_STATUS_ORDER.length];
  if (!next) throw new Error('unreachable: PROJECT_STATUS_ORDER empty');
  return next;
}
