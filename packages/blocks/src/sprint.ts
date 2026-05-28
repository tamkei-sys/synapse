/**
 * Sprint block — a 2-week iteration container. PBIs reference a Sprint;
 * SBIs roll up to the same Sprint via their parent PBI.
 *
 * Mirrors 大和心's Sprint database. Status moves planning → active →
 * review → done. Sprint length is conventionally 2 weeks (CLAUDE.md
 * project guidance), but we don't enforce the dates beyond startDate ≤
 * endDate.
 */
import { z } from 'zod';

export const SPRINT_STATUSES = ['planning', 'active', 'review', 'done'] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const sprintStatusSchema = z.enum(SPRINT_STATUSES);

export const sprintPropsSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    status: sprintStatusSchema.default('planning'),
    startDate: z.string().date(),
    endDate: z.string().date(),
    goal: z.string().max(2_000).optional(),
    /** Human-friendly id `SP-<n>`. */
    number: z.number().int().positive().optional(),
  })
  .refine((s) => s.startDate <= s.endDate, {
    message: 'startDate must be ≤ endDate',
    path: ['endDate'],
  });

export type SprintProps = z.infer<typeof sprintPropsSchema>;

/** Standard sprint length in days. Used by the planner UI default. */
export const SPRINT_LENGTH_DAYS = 14;
