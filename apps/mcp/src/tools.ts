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
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import { pbiPropsSchema, pbiStatusSchema, type PbiProps, type PbiStatus } from '@synapse/blocks';

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
  storyPoints: z.number().int().min(0).max(100).optional(),
});

export const updatePbiStatusSchema = z.object({
  pbiId: z.string().min(1),
  status: pbiStatusSchema,
});

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
  const props: PbiProps = pbiPropsSchema.parse({
    title: input.title,
    status: input.status,
    ...(typeof input.storyPoints === 'number' ? { storyPoints: input.storyPoints } : {}),
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

// ---- helpers ----------------------------------------------------------------

type BlockProjection = {
  id: string;
  props: unknown;
  updatedAt: Date | string;
};

function projectPbi(row: BlockProjection) {
  const p = (row.props ?? {}) as {
    title?: string;
    status?: PbiStatus;
    storyPoints?: number;
  };
  return {
    id: row.id,
    title: p.title ?? 'Untitled',
    status: p.status ?? 'backlog',
    ...(typeof p.storyPoints === 'number' ? { storyPoints: p.storyPoints } : {}),
    updatedAt: row.updatedAt,
  };
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
