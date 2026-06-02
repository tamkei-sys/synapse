/**
 * MCP tool implementations.
 *
 * Pure functions over `(ctx, args)` so they can be unit-tested without
 * spinning up the MCP transport. The dispatcher in `index.ts` wraps
 * each call with audit logging.
 *
 * S6 surface (CLAUDE.md §6 "Layer 1"):
 *   - synapse_list_pbis           read
 *   - synapse_get_pbi             read
 *   - synapse_create_pbi          write
 *   - synapse_update_pbi_status   write — destructive
 */
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import {
  pbiEstimateSchema,
  pbiPropsSchema,
  pbiStatusSchema,
  prioritySchema,
  projectPropsSchema,
  projectStatusSchema,
  sbiPropsSchema,
  sbiStatusSchema,
  SPRINT_LENGTH_DAYS,
  sprintPropsSchema,
  sprintStatusSchema,
  type PbiProps,
  type PbiStatus,
} from '@synapse/blocks';

import { type Database, schema } from './db.js';

export type ToolContext = {
  db: Database;
  workspaceId: string;
  userId: string;
};

// ---- schemas ----------------------------------------------------------------

export const listPbisSchema = z.object({
  status: pbiStatusSchema.optional(),
});

export const getPbiSchema = z.object({
  pbiId: z.string().min(1),
});

export const createPbiSchema = z.object({
  title: z.string().trim().min(1).max(200),
  status: pbiStatusSchema.default('backlog'),
  priority: prioritySchema.optional(),
  estimate: pbiEstimateSchema.optional(),
  storyPoints: z.number().int().min(0).max(100).optional(),
  projectId: z.string().optional(),
  sprintId: z.string().optional(),
  dueDate: z.string().date().optional(),
});

export const updatePbiStatusSchema = z.object({
  pbiId: z.string().min(1),
  status: pbiStatusSchema,
});

// Full patch — title/priority/estimate/links/assignees, not just status.
// Mirrors tRPC `pbi.update`: explicit `null` clears a field, `undefined`
// leaves it untouched. (PBI-97)
export const updatePbiSchema = z.object({
  pbiId: z.string().min(1),
  patch: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    status: pbiStatusSchema.optional(),
    priority: prioritySchema.optional(),
    estimate: pbiEstimateSchema.optional(),
    storyPoints: z.number().int().min(0).max(100).nullable().optional(),
    projectId: z.string().nullable().optional(),
    sprintId: z.string().nullable().optional(),
    dueDate: z.string().date().nullable().optional(),
    assigneeIds: z.array(z.string()).max(16).optional(),
  }),
});

// SBI management — concrete tasks under a PBI, sized in hours. (PBI-98)
export const createSbiSchema = z.object({
  pbiId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  estimateHours: z.number().min(0).max(200).optional(),
  assigneeId: z.string().optional(),
});

export const updateSbiSchema = z.object({
  sbiId: z.string().min(1),
  patch: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    status: sbiStatusSchema.optional(),
    assigneeId: z.string().nullable().optional(),
    estimateHours: z.number().min(0).max(200).nullable().optional(),
    actualHours: z.number().min(0).max(2000).nullable().optional(),
    dueDate: z.string().date().nullable().optional(),
  }),
});

// Project & Sprint management. (PBI-99)
export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(200),
  status: projectStatusSchema.optional(),
  priority: prioritySchema.optional(),
});

export const updateProjectSchema = z.object({
  projectId: z.string().min(1),
  patch: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    status: projectStatusSchema.optional(),
    priority: prioritySchema.optional(),
    ownerId: z.string().nullable().optional(),
    startDate: z.string().date().nullable().optional(),
    plannedDate: z.string().date().nullable().optional(),
    completedDate: z.string().date().nullable().optional(),
  }),
});

export const createSprintSchema = z.object({
  name: z.string().trim().min(1).max(200),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  goal: z.string().max(2_000).optional(),
  status: sprintStatusSchema.optional(),
});

export const updateSprintSchema = z.object({
  sprintId: z.string().min(1),
  patch: z.object({
    name: z.string().trim().min(1).max(200).optional(),
    status: sprintStatusSchema.optional(),
    startDate: z.string().date().optional(),
    endDate: z.string().date().optional(),
    goal: z.string().max(2_000).nullable().optional(),
  }),
});

export const sprintMetricsSchema = z.object({
  sprintId: z.string().min(1),
});

// Discovery (read) — PBI-96. Lets an MCP client orient itself in the
// Project → Sprint → PBI → SBI hierarchy instead of only seeing a flat
// PBI list. All are workspace-scoped via the resolved token.
export const listProjectsSchema = z.object({});
export const listSprintsSchema = z.object({});
export const listSbisSchema = z.object({
  pbiId: z.string().min(1),
});
export const getOverviewSchema = z.object({});

// ---- handlers ---------------------------------------------------------------

export async function listPbis(
  ctx: ToolContext,
  input: z.infer<typeof listPbisSchema>,
): Promise<unknown> {
  const filters = [
    eq(schema.block.workspaceId, ctx.workspaceId),
    eq(schema.block.type, 'pbi'),
    isNull(schema.block.deletedAt),
  ];
  if (input.status) {
    filters.push(sql`(props->>'status') = ${input.status}`);
  }
  const rows = await ctx.db
    .select({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    })
    .from(schema.block)
    .where(and(...filters))
    .orderBy(asc(schema.block.position));
  return rows.map((r) => projectPbi(r));
}

export async function getPbi(
  ctx: ToolContext,
  input: z.infer<typeof getPbiSchema>,
): Promise<unknown> {
  const [row] = await ctx.db
    .select({
      id: schema.block.id,
      workspaceId: schema.block.workspaceId,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.pbiId),
        eq(schema.block.type, 'pbi'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new ToolError('NOT_FOUND', `PBI ${input.pbiId} not found`);
  if (row.workspaceId !== ctx.workspaceId) {
    // Token is workspace-scoped; never expose cross-workspace data.
    throw new ToolError('FORBIDDEN', 'PBI belongs to a different workspace');
  }
  return projectPbi(row);
}

export async function createPbi(
  ctx: ToolContext,
  input: z.infer<typeof createPbiSchema>,
): Promise<unknown> {
  const id = ulid();
  const number = await allocateNumber(ctx, 'pbi');
  const props: PbiProps = pbiPropsSchema.parse({
    title: input.title,
    status: input.status,
    number,
    ...(input.priority ? { priority: input.priority } : {}),
    ...(typeof input.estimate === 'number' ? { estimate: input.estimate } : {}),
    ...(typeof input.storyPoints === 'number' ? { storyPoints: input.storyPoints } : {}),
    ...(input.projectId ? { projectId: input.projectId } : {}),
    ...(input.sprintId ? { sprintId: input.sprintId } : {}),
    ...(input.dueDate ? { dueDate: input.dueDate } : {}),
  });

  const [row] = await ctx.db
    .insert(schema.block)
    .values({
      id,
      workspaceId: ctx.workspaceId,
      parentId: null,
      type: 'pbi',
      position: id,
      props,
      createdBy: ctx.userId,
    })
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!row) throw new ToolError('INTERNAL', 'insert failed');
  return projectPbi(row);
}

export async function updatePbiStatus(
  ctx: ToolContext,
  input: z.infer<typeof updatePbiStatusSchema>,
): Promise<unknown> {
  const [existing] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.pbiId),
        eq(schema.block.type, 'pbi'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new ToolError('NOT_FOUND', `PBI ${input.pbiId} not found`);
  if (existing.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'PBI belongs to a different workspace');
  }

  const current = (existing.props ?? {}) as Record<string, unknown>;
  const validated = pbiPropsSchema.parse({ ...current, status: input.status });

  const [updated] = await ctx.db
    .update(schema.block)
    .set({
      props: validated,
      version: sql`${schema.block.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.block.id, input.pbiId))
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!updated) throw new ToolError('INTERNAL', 'update failed');
  return projectPbi(updated);
}

export async function updatePbi(
  ctx: ToolContext,
  input: z.infer<typeof updatePbiSchema>,
): Promise<unknown> {
  const [existing] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.pbiId),
        eq(schema.block.type, 'pbi'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new ToolError('NOT_FOUND', `PBI ${input.pbiId} not found`);
  if (existing.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'PBI belongs to a different workspace');
  }

  const current = (existing.props ?? {}) as Record<string, unknown>;
  const p = input.patch;
  // `null` clears the field, a value overwrites, `undefined` keeps it.
  const merged: Record<string, unknown> = { ...current };
  if (p.title !== undefined) merged['title'] = p.title;
  if (p.status !== undefined) merged['status'] = p.status;
  if (p.priority !== undefined) merged['priority'] = p.priority;
  if (p.estimate !== undefined) merged['estimate'] = p.estimate;
  if (p.storyPoints === null) delete merged['storyPoints'];
  else if (typeof p.storyPoints === 'number') merged['storyPoints'] = p.storyPoints;
  if (p.projectId === null) delete merged['projectId'];
  else if (typeof p.projectId === 'string') merged['projectId'] = p.projectId;
  if (p.sprintId === null) delete merged['sprintId'];
  else if (typeof p.sprintId === 'string') merged['sprintId'] = p.sprintId;
  if (p.dueDate === null) delete merged['dueDate'];
  else if (typeof p.dueDate === 'string') merged['dueDate'] = p.dueDate;
  if (p.assigneeIds !== undefined) {
    if (p.assigneeIds.length === 0) delete merged['assigneeIds'];
    else merged['assigneeIds'] = p.assigneeIds;
  }

  const validated = pbiPropsSchema.parse(merged);

  const [updated] = await ctx.db
    .update(schema.block)
    .set({
      props: validated,
      version: sql`${schema.block.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.block.id, input.pbiId))
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!updated) throw new ToolError('INTERNAL', 'update failed');
  return projectPbi(updated);
}

// ---- SBI handlers (PBI-98) --------------------------------------------------

export async function createSbi(
  ctx: ToolContext,
  input: z.infer<typeof createSbiSchema>,
): Promise<unknown> {
  const [pbi] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.pbiId),
        eq(schema.block.type, 'pbi'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!pbi) throw new ToolError('NOT_FOUND', `PBI ${input.pbiId} not found`);
  if (pbi.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'PBI belongs to a different workspace');
  }

  const number = await allocateNumber(ctx, 'sbi');
  const id = ulid();
  const props = sbiPropsSchema.parse({
    title: input.title,
    pbiId: input.pbiId,
    number,
    ...(typeof input.estimateHours === 'number' ? { estimateHours: input.estimateHours } : {}),
    ...(input.assigneeId ? { assigneeId: input.assigneeId } : {}),
  });

  const [row] = await ctx.db
    .insert(schema.block)
    .values({
      id,
      workspaceId: ctx.workspaceId,
      parentId: input.pbiId,
      type: 'sbi',
      position: id,
      props,
      createdBy: ctx.userId,
    })
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!row) throw new ToolError('INTERNAL', 'insert failed');
  return projectSbi(row);
}

export async function updateSbi(
  ctx: ToolContext,
  input: z.infer<typeof updateSbiSchema>,
): Promise<unknown> {
  const [existing] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.sbiId),
        eq(schema.block.type, 'sbi'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new ToolError('NOT_FOUND', `SBI ${input.sbiId} not found`);
  if (existing.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'SBI belongs to a different workspace');
  }

  const current = (existing.props ?? {}) as Record<string, unknown>;
  const p = input.patch;
  const merged: Record<string, unknown> = { ...current };
  if (p.title !== undefined) merged['title'] = p.title;
  if (p.status !== undefined) merged['status'] = p.status;
  if (p.assigneeId === null) delete merged['assigneeId'];
  else if (typeof p.assigneeId === 'string') merged['assigneeId'] = p.assigneeId;
  if (p.estimateHours === null) delete merged['estimateHours'];
  else if (typeof p.estimateHours === 'number') merged['estimateHours'] = p.estimateHours;
  if (p.actualHours === null) delete merged['actualHours'];
  else if (typeof p.actualHours === 'number') merged['actualHours'] = p.actualHours;
  if (p.dueDate === null) delete merged['dueDate'];
  else if (typeof p.dueDate === 'string') merged['dueDate'] = p.dueDate;
  // Auto-stamp lifecycle dates on status transitions (mirrors tRPC sbi.update).
  if (p.status === 'in_progress' && !current['startedAt']) {
    merged['startedAt'] = new Date().toISOString();
  }
  if (p.status === 'done' && !current['completedAt']) {
    merged['completedAt'] = new Date().toISOString();
  }

  const validated = sbiPropsSchema.parse(merged);

  const [row] = await ctx.db
    .update(schema.block)
    .set({
      props: validated,
      version: sql`${schema.block.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.block.id, input.sbiId))
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!row) throw new ToolError('INTERNAL', 'update failed');
  return projectSbi(row);
}

// ---- project & sprint handlers (PBI-99) -------------------------------------

export async function createProject(
  ctx: ToolContext,
  input: z.infer<typeof createProjectSchema>,
): Promise<unknown> {
  const number = await allocateNumber(ctx, 'project');
  const id = ulid();
  const props = projectPropsSchema.parse({
    name: input.name,
    number,
    ...(input.status ? { status: input.status } : {}),
    ...(input.priority ? { priority: input.priority } : {}),
  });
  const [row] = await ctx.db
    .insert(schema.block)
    .values({
      id,
      workspaceId: ctx.workspaceId,
      parentId: null,
      type: 'project',
      position: id,
      props,
      createdBy: ctx.userId,
    })
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!row) throw new ToolError('INTERNAL', 'insert failed');
  return projectProject(row);
}

export async function updateProject(
  ctx: ToolContext,
  input: z.infer<typeof updateProjectSchema>,
): Promise<unknown> {
  const [existing] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.projectId),
        eq(schema.block.type, 'project'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new ToolError('NOT_FOUND', `Project ${input.projectId} not found`);
  if (existing.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'Project belongs to a different workspace');
  }

  const current = (existing.props ?? {}) as Record<string, unknown>;
  const p = input.patch;
  const merged: Record<string, unknown> = { ...current };
  if (p.name !== undefined) merged['name'] = p.name;
  if (p.status !== undefined) merged['status'] = p.status;
  if (p.priority !== undefined) merged['priority'] = p.priority;
  if (p.ownerId === null) delete merged['ownerId'];
  else if (typeof p.ownerId === 'string') merged['ownerId'] = p.ownerId;
  if (p.startDate === null) delete merged['startDate'];
  else if (typeof p.startDate === 'string') merged['startDate'] = p.startDate;
  if (p.plannedDate === null) delete merged['plannedDate'];
  else if (typeof p.plannedDate === 'string') merged['plannedDate'] = p.plannedDate;
  if (p.completedDate === null) delete merged['completedDate'];
  else if (typeof p.completedDate === 'string') merged['completedDate'] = p.completedDate;

  const validated = projectPropsSchema.parse(merged);
  const [row] = await ctx.db
    .update(schema.block)
    .set({
      props: validated,
      version: sql`${schema.block.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.block.id, input.projectId))
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!row) throw new ToolError('INTERNAL', 'update failed');
  return projectProject(row);
}

export async function createSprint(
  ctx: ToolContext,
  input: z.infer<typeof createSprintSchema>,
): Promise<unknown> {
  const number = await allocateNumber(ctx, 'sprint');
  const id = ulid();
  const now = new Date();
  const startDate = input.startDate ?? now.toISOString().slice(0, 10);
  const endDate =
    input.endDate ??
    new Date(now.getTime() + SPRINT_LENGTH_DAYS * 86_400_000).toISOString().slice(0, 10);
  const props = sprintPropsSchema.parse({
    name: input.name,
    startDate,
    endDate,
    number,
    ...(input.goal !== undefined ? { goal: input.goal } : {}),
    ...(input.status ? { status: input.status } : {}),
  });
  const [row] = await ctx.db
    .insert(schema.block)
    .values({
      id,
      workspaceId: ctx.workspaceId,
      parentId: null,
      type: 'sprint',
      position: id,
      props,
      createdBy: ctx.userId,
    })
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!row) throw new ToolError('INTERNAL', 'insert failed');
  return projectSprint(row);
}

export async function updateSprint(
  ctx: ToolContext,
  input: z.infer<typeof updateSprintSchema>,
): Promise<unknown> {
  const [existing] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.sprintId),
        eq(schema.block.type, 'sprint'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!existing) throw new ToolError('NOT_FOUND', `Sprint ${input.sprintId} not found`);
  if (existing.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'Sprint belongs to a different workspace');
  }

  const current = (existing.props ?? {}) as Record<string, unknown>;
  const p = input.patch;
  const merged: Record<string, unknown> = { ...current };
  if (p.name !== undefined) merged['name'] = p.name;
  if (p.status !== undefined) merged['status'] = p.status;
  if (p.startDate !== undefined) merged['startDate'] = p.startDate;
  if (p.endDate !== undefined) merged['endDate'] = p.endDate;
  if (p.goal === null) delete merged['goal'];
  else if (typeof p.goal === 'string') merged['goal'] = p.goal;

  // sprintPropsSchema enforces startDate <= endDate.
  const validated = sprintPropsSchema.parse(merged);
  const [row] = await ctx.db
    .update(schema.block)
    .set({
      props: validated,
      version: sql`${schema.block.version} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(schema.block.id, input.sprintId))
    .returning({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    });
  if (!row) throw new ToolError('INTERNAL', 'update failed');
  return projectSprint(row);
}

/**
 * Sprint progress summary for agent reporting. Unlike tRPC `sprint.metrics`
 * (which returns a per-day burndown series for charting), this returns the
 * roll-up an agent reasons about: hours total/done/remaining, PBI counts,
 * and percent complete.
 */
export async function sprintMetrics(
  ctx: ToolContext,
  input: z.infer<typeof sprintMetricsSchema>,
): Promise<unknown> {
  const [sprint] = await ctx.db
    .select({
      workspaceId: schema.block.workspaceId,
      props: schema.block.props,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.id, input.sprintId),
        eq(schema.block.type, 'sprint'),
        isNull(schema.block.deletedAt),
      ),
    )
    .limit(1);
  if (!sprint) throw new ToolError('NOT_FOUND', `Sprint ${input.sprintId} not found`);
  if (sprint.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'Sprint belongs to a different workspace');
  }
  const sp = (sprint.props ?? {}) as { startDate?: string; endDate?: string; number?: number };

  const allPbis = await ctx.db
    .select({ id: schema.block.id, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, ctx.workspaceId),
        eq(schema.block.type, 'pbi'),
        isNull(schema.block.deletedAt),
      ),
    );
  const sprintPbis = allPbis.filter(
    (pbi) => (pbi.props as { sprintId?: string } | null)?.sprintId === input.sprintId,
  );

  let totalHours = 0;
  let completedHours = 0;
  if (sprintPbis.length > 0) {
    const sbis = await ctx.db
      .select({ props: schema.block.props })
      .from(schema.block)
      .where(
        and(
          inArray(
            schema.block.parentId,
            sprintPbis.map((pbi) => pbi.id),
          ),
          eq(schema.block.type, 'sbi'),
          isNull(schema.block.deletedAt),
        ),
      );
    for (const s of sbis) {
      const sprops = (s.props ?? {}) as { status?: string; estimateHours?: number };
      const hours = sprops.estimateHours ?? 0;
      totalHours += hours;
      if (sprops.status === 'done') completedHours += hours;
    }
  }

  const completedPbis = sprintPbis.filter(
    (pbi) => (pbi.props as { status?: string } | null)?.status === 'done',
  ).length;
  const remainingHours = Math.max(0, totalHours - completedHours);
  const pctComplete =
    totalHours > 0
      ? Math.round((completedHours / totalHours) * 100)
      : sprintPbis.length > 0
        ? Math.round((completedPbis / sprintPbis.length) * 100)
        : 0;

  return {
    sprintId: input.sprintId,
    ...(typeof sp.number === 'number' ? { key: `SP-${sp.number}` } : {}),
    startDate: sp.startDate ?? null,
    endDate: sp.endDate ?? null,
    totalPbis: sprintPbis.length,
    completedPbis,
    totalHours,
    completedHours,
    remainingHours,
    pctComplete,
  };
}

// ---- discovery handlers (PBI-96) --------------------------------------------

export async function listProjects(
  ctx: ToolContext,
  _input: z.infer<typeof listProjectsSchema>,
): Promise<unknown> {
  const rows = await ctx.db
    .select({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, ctx.workspaceId),
        eq(schema.block.type, 'project'),
        isNull(schema.block.deletedAt),
      ),
    )
    .orderBy(asc(schema.block.position));
  return rows.map((r) => projectProject(r));
}

export async function listSprints(
  ctx: ToolContext,
  _input: z.infer<typeof listSprintsSchema>,
): Promise<unknown> {
  const rows = await ctx.db
    .select({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, ctx.workspaceId),
        eq(schema.block.type, 'sprint'),
        isNull(schema.block.deletedAt),
      ),
    )
    .orderBy(asc(schema.block.position));
  return rows.map((r) => projectSprint(r));
}

export async function listSbis(
  ctx: ToolContext,
  input: z.infer<typeof listSbisSchema>,
): Promise<unknown> {
  // SBIs are children of a PBI. Scope by workspace AND parentId so a
  // foreign pbiId simply yields an empty list (no cross-workspace leak).
  const rows = await ctx.db
    .select({
      id: schema.block.id,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, ctx.workspaceId),
        eq(schema.block.type, 'sbi'),
        eq(schema.block.parentId, input.pbiId),
        isNull(schema.block.deletedAt),
      ),
    )
    .orderBy(asc(schema.block.position));
  return rows.map((r) => projectSbi(r));
}

export async function getOverview(
  ctx: ToolContext,
  _input: z.infer<typeof getOverviewSchema>,
): Promise<unknown> {
  // One pass over the PM block types so an agent can size up the
  // workspace before drilling in.
  const rows = await ctx.db
    .select({ type: schema.block.type, props: schema.block.props })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, ctx.workspaceId),
        isNull(schema.block.deletedAt),
        inArray(schema.block.type, ['project', 'sprint', 'pbi', 'sbi']),
      ),
    );
  const counts = { projects: 0, sprints: 0, pbis: 0, sbis: 0 };
  const pbisByStatus: Record<string, number> = {};
  const sbisByStatus: Record<string, number> = {};
  for (const r of rows) {
    const status = ((r.props ?? {}) as { status?: string }).status ?? 'unknown';
    if (r.type === 'project') counts.projects += 1;
    else if (r.type === 'sprint') counts.sprints += 1;
    else if (r.type === 'pbi') {
      counts.pbis += 1;
      pbisByStatus[status] = (pbisByStatus[status] ?? 0) + 1;
    } else if (r.type === 'sbi') {
      counts.sbis += 1;
      sbisByStatus[status] = (sbisByStatus[status] ?? 0) + 1;
    }
  }
  return { ...counts, pbisByStatus, sbisByStatus };
}

// ---- helpers ----------------------------------------------------------------

type BlockProjection = {
  id: string;
  props: unknown;
  updatedAt: Date | string;
};

export function projectPbi(row: BlockProjection) {
  const p = (row.props ?? {}) as {
    title?: string;
    status?: PbiStatus;
    priority?: string;
    estimate?: number;
    storyPoints?: number;
    assigneeIds?: string[];
    dueDate?: string;
    projectId?: string;
    sprintId?: string;
    number?: number;
  };
  return {
    id: row.id,
    ...(typeof p.number === 'number' ? { key: `PBI-${p.number}` } : {}),
    title: p.title ?? 'Untitled',
    status: p.status ?? 'backlog',
    priority: p.priority ?? 'should',
    ...(typeof p.estimate === 'number' ? { estimate: p.estimate } : {}),
    ...(typeof p.storyPoints === 'number' ? { storyPoints: p.storyPoints } : {}),
    ...(Array.isArray(p.assigneeIds) && p.assigneeIds.length ? { assigneeIds: p.assigneeIds } : {}),
    ...(p.dueDate ? { dueDate: p.dueDate } : {}),
    ...(p.projectId ? { projectId: p.projectId } : {}),
    ...(p.sprintId ? { sprintId: p.sprintId } : {}),
    updatedAt: row.updatedAt,
  };
}

export function projectProject(row: BlockProjection) {
  const p = (row.props ?? {}) as {
    name?: string;
    status?: string;
    priority?: string;
    ownerId?: string;
    startDate?: string;
    plannedDate?: string;
    completedDate?: string;
    number?: number;
  };
  return {
    id: row.id,
    ...(typeof p.number === 'number' ? { key: `PRJ-${p.number}` } : {}),
    name: p.name ?? 'Untitled',
    status: p.status ?? 'backlog',
    priority: p.priority ?? 'should',
    ...(p.ownerId ? { ownerId: p.ownerId } : {}),
    ...(p.startDate ? { startDate: p.startDate } : {}),
    ...(p.plannedDate ? { plannedDate: p.plannedDate } : {}),
    ...(p.completedDate ? { completedDate: p.completedDate } : {}),
    updatedAt: row.updatedAt,
  };
}

export function projectSprint(row: BlockProjection) {
  const p = (row.props ?? {}) as {
    name?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    goal?: string;
    number?: number;
  };
  return {
    id: row.id,
    ...(typeof p.number === 'number' ? { key: `SP-${p.number}` } : {}),
    name: p.name ?? 'Untitled',
    status: p.status ?? 'planning',
    ...(p.startDate ? { startDate: p.startDate } : {}),
    ...(p.endDate ? { endDate: p.endDate } : {}),
    ...(p.goal ? { goal: p.goal } : {}),
    updatedAt: row.updatedAt,
  };
}

export function projectSbi(row: BlockProjection) {
  const p = (row.props ?? {}) as {
    title?: string;
    status?: string;
    assigneeId?: string;
    estimateHours?: number;
    actualHours?: number;
    dueDate?: string;
    pbiId?: string;
    number?: number;
  };
  return {
    id: row.id,
    ...(typeof p.number === 'number' ? { key: `SBI-${p.number}` } : {}),
    title: p.title ?? 'Untitled',
    status: p.status ?? 'todo',
    ...(p.assigneeId ? { assigneeId: p.assigneeId } : {}),
    ...(typeof p.estimateHours === 'number' ? { estimateHours: p.estimateHours } : {}),
    ...(typeof p.actualHours === 'number' ? { actualHours: p.actualHours } : {}),
    ...(p.dueDate ? { dueDate: p.dueDate } : {}),
    ...(p.pbiId ? { pbiId: p.pbiId } : {}),
    updatedAt: row.updatedAt,
  };
}

/**
 * Allocate the next human number for a workspace + entity kind via the
 * shared `entity_sequence` table. Atomic upsert — mirrors the API's
 * allocateHumanId so MCP-created PBIs/SBIs get the same PBI-n / SBI-n keys.
 */
async function allocateNumber(
  ctx: ToolContext,
  kind: 'pbi' | 'sbi' | 'project' | 'sprint',
): Promise<number> {
  const [row] = await ctx.db
    .insert(schema.entitySequence)
    .values({ workspaceId: ctx.workspaceId, kind, nextId: 2 })
    .onConflictDoUpdate({
      target: [schema.entitySequence.workspaceId, schema.entitySequence.kind],
      set: { nextId: sql`${schema.entitySequence.nextId} + 1`, updatedAt: new Date() },
    })
    .returning({ nextId: schema.entitySequence.nextId });
  return (row?.nextId ?? 2) - 1;
}

export class ToolError extends Error {
  constructor(
    public code: 'NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL' | 'INVALID',
    message: string,
  ) {
    super(message);
    this.name = 'ToolError';
  }
}
