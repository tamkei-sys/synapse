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
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { z } from 'zod';

import type { ServiceCaller } from '@synapse/api/server';

import {
  commentPropsSchema,
  dbCellValueSchema,
  dbColumnSchema,
  extractMentions,
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
  /**
   * In-process tRPC caller bound to the resolved actor. Page (and future
   * block) tools reuse the API's procedures through this rather than
   * re-implementing their logic against the DB. (PBI: MCP page tools)
   */
  caller: ServiceCaller;
  /**
   * Sync server's internal doc-write endpoint (ADR-0011). Present only when
   * SYNC_INTERNAL_URL + SYNC_INTERNAL_SECRET are configured; the body-editing
   * tools require it.
   */
  docWrite?: { url: string; secret: string };
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

// GitHub Issue linking (PBI-122). Wraps the API's pbi.linkGithubIssue /
// unlinkGithubIssue through the service caller. Flat args are assembled into
// the tRPC `{ pbiId, link }` shape; the strict owner/repo regex validation
// lives in pbiGithubLinkSchema inside the procedure.
export const linkGithubIssueSchema = z.object({
  pbiId: z.string().min(1),
  owner: z.string().trim().min(1).max(64),
  repo: z.string().trim().min(1).max(100),
  issueNumber: z.number().int().positive(),
  state: z.enum(['open', 'closed']).optional(),
});

export const unlinkGithubIssueSchema = z.object({
  pbiId: z.string().min(1),
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

// Dependencies — "blockId is blocked by dependsOnId". (PBI-100)
export const addDependencySchema = z.object({
  blockId: z.string().min(1),
  dependsOnId: z.string().min(1),
  note: z.string().max(500).optional(),
});

export const removeDependencySchema = z.object({
  blockId: z.string().min(1),
  dependsOnId: z.string().min(1),
});

export const listDependenciesSchema = z.object({
  blockId: z.string().min(1),
});

// Comments & collaboration. (PBI-101)
export const addCommentSchema = z.object({
  blockId: z.string().min(1),
  body: z.string().trim().min(1).max(4_000),
});

export const listCommentsSchema = z.object({
  blockId: z.string().min(1),
});

// Comment lifecycle (PBI-127). resolve / react / delete wrap the comment
// router through the caller so its author/admin authorization is reused.
// (create/list stay direct-DB above — the router's create depends on env /
// waitUntil delivery the MCP context doesn't have.)
export const resolveCommentSchema = z.object({
  commentId: z.string().min(1),
  resolved: z.boolean().default(true),
});

export const reactCommentSchema = z.object({
  commentId: z.string().min(1),
  emoji: z.enum(['👍', '🎉', '👀', '✅', '🤔']),
});

export const deleteCommentSchema = z.object({
  commentId: z.string().min(1),
});

// Search & human-id resolution. (PBI-102)
export const searchSchema = z.object({
  query: z.string().trim().min(1).max(200),
  types: z.array(z.string()).max(10).optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const resolveKeySchema = z.object({
  key: z.string().trim().min(1).max(40),
});

// Audit (read) — recent MCP tool invocations for the workspace. (PBI-103)
export const auditLogSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
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

// Docs / pages (PBI: MCP page tools). These wrap the API block router's page
// procedures through the service caller. Editing a page's *body* (Yjs) is
// intentionally out of scope — a separate tool owns it once the Yjs authoring
// path lands.
export const createPageSchema = z.object({
  title: z.string().trim().min(1).max(200).default('Untitled'),
  parentPageId: z.string().min(1).optional(),
});

export const getPageSchema = z.object({
  pageId: z.string().min(1),
});

export const listPagesSchema = z.object({});

export const updatePageTitleSchema = z.object({
  pageId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
});

export const movePageSchema = z.object({
  pageId: z.string().min(1),
  // null / omitted → move to the workspace root. Otherwise the page is
  // appended to the end of the target parent's children.
  newParentId: z.string().min(1).nullable().optional(),
});

export const trashPageSchema = z.object({
  pageId: z.string().min(1),
});

export const restorePageSchema = z.object({
  pageId: z.string().min(1),
});

// Body editing (ADR-0011). Writes go through the sync server's internal
// endpoint; the markdown is converted to the editor doc there.
export const appendDocSchema = z.object({
  pageId: z.string().min(1),
  markdown: z.string().min(1),
});

export const setDocSchema = z.object({
  pageId: z.string().min(1),
  markdown: z.string().min(1),
});

// Favorites & bookmarks (PBI-126). favorite.* wraps the per-user page-favorite
// router through the caller; bookmark.fetch is a read-only server-side OG
// metadata fetch (SSRF-guarded inside the API).
export const toggleFavoriteSchema = z.object({
  pageId: z.string().min(1),
});

export const listFavoritesSchema = z.object({});

export const isFavoriteSchema = z.object({
  pageId: z.string().min(1),
});

export const fetchBookmarkSchema = z.object({
  url: z.string().url().max(2048),
});

// User-defined DB / spreadsheet (PBI-121). Wraps the db router through the
// caller. Column / cell shapes reuse the @synapse/blocks schemas so MCP
// validates inputs exactly the way the API does.
export const createDbSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  columns: z.array(dbColumnSchema).max(40).optional(),
});

export const getDbSchema = z.object({
  dbId: z.string().min(1),
});

export const listDbsSchema = z.object({});

export const dbAddColumnSchema = z.object({
  dbId: z.string().min(1),
  column: dbColumnSchema,
});

export const dbUpdateColumnSchema = z.object({
  dbId: z.string().min(1),
  column: dbColumnSchema,
});

export const dbDeleteColumnSchema = z.object({
  dbId: z.string().min(1),
  columnId: z.string().min(1),
});

export const dbAddRowSchema = z.object({
  dbId: z.string().min(1),
  values: z.record(z.string().min(1), dbCellValueSchema).optional(),
});

export const dbUpdateCellSchema = z.object({
  rowId: z.string().min(1),
  columnId: z.string().min(1),
  value: dbCellValueSchema,
});

export const dbReorderRowsSchema = z.object({
  dbId: z.string().min(1),
  orderedRowIds: z.array(z.string().min(1)).min(1).max(2000),
});

export const dbDeleteRowSchema = z.object({
  rowId: z.string().min(1),
});

// ---- handlers ---------------------------------------------------------------

// Docs / pages. These delegate to the API block router through the service
// caller (ctx.caller) so the canonical authorization + write logic is reused.

/** Translate a tRPC error from the service caller onto MCP ToolError codes. */
function mapCallerError(err: unknown): ToolError {
  const code = (err as { code?: unknown }).code;
  const message = err instanceof Error ? err.message : String(err);
  switch (code) {
    case 'NOT_FOUND':
      return new ToolError('NOT_FOUND', message);
    case 'FORBIDDEN':
    case 'UNAUTHORIZED':
      return new ToolError('FORBIDDEN', message);
    case 'BAD_REQUEST':
    case 'PARSE_ERROR':
      return new ToolError('INVALID', message);
    default:
      return new ToolError('INTERNAL', message);
  }
}

/** Await a service-caller call, mapping tRPC errors to ToolError. */
async function viaCaller<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (err) {
    throw mapCallerError(err);
  }
}

/**
 * The block router authorizes against the *user's* workspace memberships, but
 * an MCP token is scoped to a single workspace. Enforce that scope here: the
 * referenced block must live in the token's workspace.
 */
async function assertBlockInWorkspace(
  ctx: ToolContext,
  blockId: string,
  label = 'page',
): Promise<void> {
  const [row] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(eq(schema.block.id, blockId))
    .limit(1);
  if (!row) throw new ToolError('NOT_FOUND', `${label} ${blockId} not found`);
  if (row.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', `${label} belongs to a different workspace`);
  }
}

/**
 * Compact, body-free view of a page block for MCP responses. `updatedAt` is
 * optional because the list query selects a narrower column set than the
 * single-page reads.
 */
function projectPage(row: {
  id: string;
  parentId: string | null;
  props: unknown;
  updatedAt?: Date;
}): { id: string; title: string; parentId: string | null; updatedAt?: string } {
  const props = (row.props ?? {}) as { title?: unknown };
  return {
    id: row.id,
    title: typeof props.title === 'string' ? props.title : 'Untitled',
    parentId: row.parentId,
    ...(row.updatedAt ? { updatedAt: row.updatedAt.toISOString() } : {}),
  };
}

export async function createPage(
  ctx: ToolContext,
  input: z.infer<typeof createPageSchema>,
): Promise<unknown> {
  if (input.parentPageId) await assertBlockInWorkspace(ctx, input.parentPageId);
  const page = await viaCaller(
    ctx.caller.block.createPage({
      workspaceId: ctx.workspaceId,
      title: input.title,
      ...(input.parentPageId ? { parentPageId: input.parentPageId } : {}),
    }),
  );
  return projectPage(page);
}

export async function getPage(
  ctx: ToolContext,
  input: z.infer<typeof getPageSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pageId);
  const { page } = await viaCaller(ctx.caller.block.getPage({ pageId: input.pageId }));
  return projectPage(page);
}

export async function listPages(
  ctx: ToolContext,
  _input: z.infer<typeof listPagesSchema>,
): Promise<unknown> {
  const pages = await viaCaller(ctx.caller.block.listAllPages({ workspaceId: ctx.workspaceId }));
  return pages.map(projectPage);
}

export async function updatePageTitle(
  ctx: ToolContext,
  input: z.infer<typeof updatePageTitleSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pageId);
  const page = await viaCaller(
    ctx.caller.block.updatePageTitle({ pageId: input.pageId, title: input.title }),
  );
  return projectPage(page);
}

export async function movePage(
  ctx: ToolContext,
  input: z.infer<typeof movePageSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pageId);
  const newParentId = input.newParentId ?? null;
  if (newParentId) await assertBlockInWorkspace(ctx, newParentId);

  // movePage reassigns positions from the full sibling order. Default to
  // "append to the end of the target parent" by listing the current siblings
  // and putting the moved page last.
  const siblings = await ctx.db
    .select({ id: schema.block.id })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, ctx.workspaceId),
        eq(schema.block.type, 'page'),
        newParentId ? eq(schema.block.parentId, newParentId) : isNull(schema.block.parentId),
        isNull(schema.block.deletedAt),
      ),
    )
    .orderBy(asc(schema.block.position));
  const orderedSiblingIds = [
    ...siblings.map((s) => s.id).filter((id) => id !== input.pageId),
    input.pageId,
  ];

  return viaCaller(
    ctx.caller.block.movePage({ pageId: input.pageId, newParentId, orderedSiblingIds }),
  );
}

export async function trashPage(
  ctx: ToolContext,
  input: z.infer<typeof trashPageSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pageId);
  return viaCaller(ctx.caller.block.deletePage({ pageId: input.pageId }));
}

export async function restorePage(
  ctx: ToolContext,
  input: z.infer<typeof restorePageSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pageId);
  return viaCaller(ctx.caller.block.restorePage({ pageId: input.pageId }));
}

/**
 * Append to / replace a page body via the sync server's internal doc-write
 * endpoint (ADR-0011). The page body is a live Yjs document, so the write
 * goes through sync's openDirectConnection — never the DB directly.
 */
async function postDocWrite(
  ctx: ToolContext,
  pageId: string,
  markdown: string,
  mode: 'append' | 'replace',
): Promise<unknown> {
  if (!ctx.docWrite) {
    throw new ToolError(
      'INTERNAL',
      'Document body editing is not configured (SYNC_INTERNAL_URL / SYNC_INTERNAL_SECRET unset).',
    );
  }
  await assertBlockInWorkspace(ctx, pageId);

  const url = `${ctx.docWrite.url.replace(/\/$/, '')}/internal/doc/write`;
  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-internal-secret': ctx.docWrite.secret },
      body: JSON.stringify({ blockId: pageId, actorUserId: ctx.userId, markdown, mode }),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new ToolError('INTERNAL', `sync doc-write endpoint unreachable: ${detail}`);
  }

  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) {
    const message = body?.error ?? `doc-write failed (${res.status})`;
    if (res.status === 404) throw new ToolError('NOT_FOUND', message);
    if (res.status === 401 || res.status === 403) throw new ToolError('FORBIDDEN', message);
    if (res.status === 400) throw new ToolError('INVALID', message);
    throw new ToolError('INTERNAL', message);
  }
  return body;
}

export async function appendDoc(
  ctx: ToolContext,
  input: z.infer<typeof appendDocSchema>,
): Promise<unknown> {
  return postDocWrite(ctx, input.pageId, input.markdown, 'append');
}

export async function setDoc(
  ctx: ToolContext,
  input: z.infer<typeof setDocSchema>,
): Promise<unknown> {
  return postDocWrite(ctx, input.pageId, input.markdown, 'replace');
}

// ---- GitHub Issue linking (PBI-122) -----------------------------------------
// Delegate to the API's pbi router through the caller so the canonical link
// merge + fire-and-forget outbound GitHub push is reused. Workspace scope is
// enforced locally first: the token is single-workspace, but the procedure
// only checks the actor's membership.

export async function linkGithubIssue(
  ctx: ToolContext,
  input: z.infer<typeof linkGithubIssueSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pbiId, 'PBI');
  const row = await viaCaller(
    ctx.caller.pbi.linkGithubIssue({
      pbiId: input.pbiId,
      link: {
        owner: input.owner,
        repo: input.repo,
        issueNumber: input.issueNumber,
        ...(input.state ? { state: input.state } : {}),
      },
    }),
  );
  return projectPbi(row);
}

export async function unlinkGithubIssue(
  ctx: ToolContext,
  input: z.infer<typeof unlinkGithubIssueSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pbiId, 'PBI');
  const row = await viaCaller(ctx.caller.pbi.unlinkGithubIssue({ pbiId: input.pbiId }));
  return projectPbi(row);
}

// ---- favorites & bookmarks (PBI-126) ----------------------------------------
// favorite.* delegate to the per-user favorite router via the caller;
// bookmark.fetch does a server-side OG fetch (SSRF-guarded in the API).

export async function toggleFavorite(
  ctx: ToolContext,
  input: z.infer<typeof toggleFavoriteSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pageId, 'page');
  return viaCaller(ctx.caller.favorite.toggle({ pageId: input.pageId }));
}

export async function listFavorites(
  ctx: ToolContext,
  _input: z.infer<typeof listFavoritesSchema>,
): Promise<unknown> {
  return viaCaller(ctx.caller.favorite.listMine({ workspaceId: ctx.workspaceId }));
}

export async function isFavorite(
  ctx: ToolContext,
  input: z.infer<typeof isFavoriteSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.pageId, 'page');
  return viaCaller(ctx.caller.favorite.isFavorite({ pageId: input.pageId }));
}

export async function fetchBookmark(
  ctx: ToolContext,
  input: z.infer<typeof fetchBookmarkSchema>,
): Promise<unknown> {
  return viaCaller(ctx.caller.bookmark.fetch({ url: input.url }));
}

// ---- user-defined DB / spreadsheet (PBI-121) --------------------------------
// All delegate to the db router via the caller; workspace scope is checked
// locally first for tools that reference an existing db / row id.

export async function createDb(
  ctx: ToolContext,
  input: z.infer<typeof createDbSchema>,
): Promise<unknown> {
  return viaCaller(
    ctx.caller.db.create({
      workspaceId: ctx.workspaceId,
      ...(input.title ? { title: input.title } : {}),
      ...(input.columns ? { columns: input.columns } : {}),
    }),
  );
}

export async function getDb(
  ctx: ToolContext,
  input: z.infer<typeof getDbSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.dbId, 'db');
  return viaCaller(ctx.caller.db.get({ dbId: input.dbId }));
}

export async function listDbs(
  ctx: ToolContext,
  _input: z.infer<typeof listDbsSchema>,
): Promise<unknown> {
  return viaCaller(ctx.caller.db.listForWorkspace({ workspaceId: ctx.workspaceId }));
}

export async function dbAddColumn(
  ctx: ToolContext,
  input: z.infer<typeof dbAddColumnSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.dbId, 'db');
  return viaCaller(ctx.caller.db.addColumn({ dbId: input.dbId, column: input.column }));
}

export async function dbUpdateColumn(
  ctx: ToolContext,
  input: z.infer<typeof dbUpdateColumnSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.dbId, 'db');
  return viaCaller(ctx.caller.db.updateColumn({ dbId: input.dbId, column: input.column }));
}

export async function dbDeleteColumn(
  ctx: ToolContext,
  input: z.infer<typeof dbDeleteColumnSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.dbId, 'db');
  return viaCaller(ctx.caller.db.deleteColumn({ dbId: input.dbId, columnId: input.columnId }));
}

export async function dbAddRow(
  ctx: ToolContext,
  input: z.infer<typeof dbAddRowSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.dbId, 'db');
  return viaCaller(
    ctx.caller.db.addRow({ dbId: input.dbId, ...(input.values ? { values: input.values } : {}) }),
  );
}

export async function dbUpdateCell(
  ctx: ToolContext,
  input: z.infer<typeof dbUpdateCellSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.rowId, 'db row');
  return viaCaller(
    ctx.caller.db.updateCell({
      rowId: input.rowId,
      columnId: input.columnId,
      value: input.value,
    }),
  );
}

export async function dbReorderRows(
  ctx: ToolContext,
  input: z.infer<typeof dbReorderRowsSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.dbId, 'db');
  return viaCaller(
    ctx.caller.db.reorderRows({ dbId: input.dbId, orderedRowIds: input.orderedRowIds }),
  );
}

export async function dbDeleteRow(
  ctx: ToolContext,
  input: z.infer<typeof dbDeleteRowSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.rowId, 'db row');
  return viaCaller(ctx.caller.db.deleteRow({ rowId: input.rowId }));
}

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

// ---- dependency handlers (PBI-100) ------------------------------------------

export async function addDependency(
  ctx: ToolContext,
  input: z.infer<typeof addDependencySchema>,
): Promise<unknown> {
  if (input.blockId === input.dependsOnId) {
    throw new ToolError('INVALID', 'A block cannot depend on itself.');
  }
  const rows = await ctx.db
    .select({ id: schema.block.id, workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(
      and(
        inArray(schema.block.id, [input.blockId, input.dependsOnId]),
        isNull(schema.block.deletedAt),
      ),
    );
  if (rows.length !== 2) throw new ToolError('NOT_FOUND', 'one or both blocks not found');
  for (const r of rows) {
    if (r.workspaceId !== ctx.workspaceId) {
      throw new ToolError('FORBIDDEN', 'block belongs to a different workspace');
    }
  }
  await ctx.db
    .insert(schema.blockDependency)
    .values({
      blockId: input.blockId,
      dependsOnId: input.dependsOnId,
      ...(input.note !== undefined ? { note: input.note } : {}),
    })
    .onConflictDoNothing();
  return { ok: true, blockId: input.blockId, dependsOnId: input.dependsOnId };
}

export async function removeDependency(
  ctx: ToolContext,
  input: z.infer<typeof removeDependencySchema>,
): Promise<unknown> {
  const [block] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(eq(schema.block.id, input.blockId))
    .limit(1);
  if (!block) throw new ToolError('NOT_FOUND', `block ${input.blockId} not found`);
  if (block.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'block belongs to a different workspace');
  }
  await ctx.db
    .delete(schema.blockDependency)
    .where(
      and(
        eq(schema.blockDependency.blockId, input.blockId),
        eq(schema.blockDependency.dependsOnId, input.dependsOnId),
      ),
    );
  return { ok: true };
}

export async function listDependencies(
  ctx: ToolContext,
  input: z.infer<typeof listDependenciesSchema>,
): Promise<unknown> {
  const [block] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(and(eq(schema.block.id, input.blockId), isNull(schema.block.deletedAt)))
    .limit(1);
  if (!block) throw new ToolError('NOT_FOUND', `block ${input.blockId} not found`);
  if (block.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'block belongs to a different workspace');
  }

  const blockedByEdges = await ctx.db
    .select({ id: schema.blockDependency.dependsOnId, note: schema.blockDependency.note })
    .from(schema.blockDependency)
    .where(eq(schema.blockDependency.blockId, input.blockId));
  const blocksEdges = await ctx.db
    .select({ id: schema.blockDependency.blockId, note: schema.blockDependency.note })
    .from(schema.blockDependency)
    .where(eq(schema.blockDependency.dependsOnId, input.blockId));

  const refIds = [...new Set([...blockedByEdges.map((e) => e.id), ...blocksEdges.map((e) => e.id)])];
  const refMap = new Map<string, { id: string; type: string; props: unknown }>();
  if (refIds.length > 0) {
    const refs = await ctx.db
      .select({ id: schema.block.id, type: schema.block.type, props: schema.block.props })
      .from(schema.block)
      .where(and(eq(schema.block.workspaceId, ctx.workspaceId), inArray(schema.block.id, refIds)));
    for (const r of refs) refMap.set(r.id, r);
  }
  const enrich = (e: { id: string; note: string | null }) => {
    const ref = refMap.get(e.id);
    return {
      ...(ref ? refBlock(ref) : { id: e.id }),
      ...(e.note ? { note: e.note } : {}),
    };
  };
  return { blockedBy: blockedByEdges.map(enrich), blocks: blocksEdges.map(enrich) };
}

// ---- comment handlers (PBI-101) ---------------------------------------------

export async function addComment(
  ctx: ToolContext,
  input: z.infer<typeof addCommentSchema>,
): Promise<unknown> {
  const [parent] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(and(eq(schema.block.id, input.blockId), isNull(schema.block.deletedAt)))
    .limit(1);
  if (!parent) throw new ToolError('NOT_FOUND', `block ${input.blockId} not found`);
  if (parent.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'block belongs to a different workspace');
  }

  const mentions = extractMentions(input.body);
  const props = commentPropsSchema.parse({
    body: input.body,
    ...(mentions.length > 0 ? { mentions } : {}),
  });
  const id = ulid();
  const [row] = await ctx.db
    .insert(schema.block)
    .values({
      id,
      workspaceId: ctx.workspaceId,
      parentId: input.blockId,
      type: 'comment',
      position: id,
      props,
      createdBy: ctx.userId,
    })
    .returning({ id: schema.block.id, createdAt: schema.block.createdAt });
  if (!row) throw new ToolError('INTERNAL', 'insert failed');

  await fanoutMentions(ctx, {
    blockId: input.blockId,
    commentId: row.id,
    mentions,
    body: input.body,
  });

  return {
    id: row.id,
    body: input.body,
    ...(mentions.length > 0 ? { mentions } : {}),
    createdAt: row.createdAt,
  };
}

export async function listComments(
  ctx: ToolContext,
  input: z.infer<typeof listCommentsSchema>,
): Promise<unknown> {
  const [parent] = await ctx.db
    .select({ workspaceId: schema.block.workspaceId })
    .from(schema.block)
    .where(and(eq(schema.block.id, input.blockId), isNull(schema.block.deletedAt)))
    .limit(1);
  if (!parent) throw new ToolError('NOT_FOUND', `block ${input.blockId} not found`);
  if (parent.workspaceId !== ctx.workspaceId) {
    throw new ToolError('FORBIDDEN', 'block belongs to a different workspace');
  }

  const rows = await ctx.db
    .select({
      id: schema.block.id,
      props: schema.block.props,
      createdAt: schema.block.createdAt,
      authorName: schema.user.name,
    })
    .from(schema.block)
    .innerJoin(schema.user, eq(schema.block.createdBy, schema.user.id))
    .where(
      and(
        eq(schema.block.parentId, input.blockId),
        eq(schema.block.type, 'comment'),
        isNull(schema.block.deletedAt),
      ),
    )
    .orderBy(asc(schema.block.createdAt));

  return rows.map((r) => {
    const p = (r.props ?? {}) as {
      body?: string;
      mentions?: string[];
      resolved?: boolean;
      parentCommentId?: string;
    };
    return {
      id: r.id,
      body: p.body ?? '',
      author: r.authorName ?? null,
      createdAt: r.createdAt,
      resolved: Boolean(p.resolved),
      ...(Array.isArray(p.mentions) && p.mentions.length > 0 ? { mentions: p.mentions } : {}),
      ...(p.parentCommentId ? { parentCommentId: p.parentCommentId } : {}),
    };
  });
}

// ---- comment lifecycle (PBI-127) --------------------------------------------
// resolve / react / delete delegate to the comment router via the caller so
// the canonical authorization (delete = author or admin/owner) is reused.

export async function resolveComment(
  ctx: ToolContext,
  input: z.infer<typeof resolveCommentSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.commentId, 'comment');
  return viaCaller(
    ctx.caller.comment.setResolved({ commentId: input.commentId, resolved: input.resolved }),
  );
}

export async function reactComment(
  ctx: ToolContext,
  input: z.infer<typeof reactCommentSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.commentId, 'comment');
  return viaCaller(
    ctx.caller.comment.toggleReaction({ commentId: input.commentId, emoji: input.emoji }),
  );
}

export async function deleteComment(
  ctx: ToolContext,
  input: z.infer<typeof deleteCommentSchema>,
): Promise<unknown> {
  await assertBlockInWorkspace(ctx, input.commentId, 'comment');
  return viaCaller(ctx.caller.comment.delete({ commentId: input.commentId }));
}

// ---- search & resolve handlers (PBI-102) ------------------------------------

export async function searchWorkspace(
  ctx: ToolContext,
  input: z.infer<typeof searchSchema>,
): Promise<unknown> {
  // DB-backed substring search over block props. MCP has no Typesense
  // credentials (env is DB + token only), so we match title/name/body
  // directly. The query value is parameterized by the sql template.
  const like = `%${input.query}%`;
  const filters = [
    eq(schema.block.workspaceId, ctx.workspaceId),
    isNull(schema.block.deletedAt),
    sql`(
      (${schema.block.props}->>'title') ILIKE ${like}
      OR (${schema.block.props}->>'name') ILIKE ${like}
      OR (${schema.block.props}->>'body') ILIKE ${like}
    )`,
  ];
  if (input.types && input.types.length > 0) {
    filters.push(inArray(schema.block.type, input.types));
  }
  const rows = await ctx.db
    .select({
      id: schema.block.id,
      type: schema.block.type,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    })
    .from(schema.block)
    .where(and(...filters))
    .orderBy(desc(schema.block.updatedAt))
    .limit(input.limit);
  return rows.map((r) => ({ ...refBlock(r), updatedAt: r.updatedAt }));
}

export async function resolveKey(
  ctx: ToolContext,
  input: z.infer<typeof resolveKeySchema>,
): Promise<unknown> {
  const KEY_TO_TYPE: Record<string, string> = {
    PBI: 'pbi',
    SBI: 'sbi',
    PRJ: 'project',
    SP: 'sprint',
  };
  const m = /^(PBI|SBI|PRJ|SP)-(\d+)$/i.exec(input.key.trim());
  if (!m) {
    throw new ToolError(
      'INVALID',
      `Unrecognized key "${input.key}". Expected PBI-n / SBI-n / PRJ-n / SP-n.`,
    );
  }
  const [, rawPrefix, num] = m;
  const type = rawPrefix ? KEY_TO_TYPE[rawPrefix.toUpperCase()] : undefined;
  if (!type || !num) throw new ToolError('INVALID', `Unrecognized key "${input.key}".`);

  const [row] = await ctx.db
    .select({
      id: schema.block.id,
      type: schema.block.type,
      props: schema.block.props,
      updatedAt: schema.block.updatedAt,
    })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, ctx.workspaceId),
        eq(schema.block.type, type),
        isNull(schema.block.deletedAt),
        sql`(${schema.block.props}->>'number') = ${num}`,
      ),
    )
    .limit(1);
  if (!row) throw new ToolError('NOT_FOUND', `${input.key} not found`);
  switch (type) {
    case 'pbi':
      return projectPbi(row);
    case 'project':
      return projectProject(row);
    case 'sprint':
      return projectSprint(row);
    case 'sbi':
      return projectSbi(row);
    default:
      return refBlock(row);
  }
}

// ---- audit handler (PBI-103) ------------------------------------------------

export async function auditLog(
  ctx: ToolContext,
  input: z.infer<typeof auditLogSchema>,
): Promise<unknown> {
  const rows = await ctx.db
    .select({
      id: schema.auditLog.id,
      tool: schema.auditLog.tool,
      result: schema.auditLog.result,
      errorMessage: schema.auditLog.errorMessage,
      actorUserId: schema.auditLog.actorUserId,
      createdAt: schema.auditLog.createdAt,
    })
    .from(schema.auditLog)
    .where(eq(schema.auditLog.workspaceId, ctx.workspaceId))
    .orderBy(desc(schema.auditLog.createdAt))
    .limit(input.limit);
  return rows.map((r) => ({
    id: r.id,
    tool: r.tool,
    result: r.result,
    ...(r.errorMessage ? { error: r.errorMessage } : {}),
    actorUserId: r.actorUserId,
    at: r.createdAt,
  }));
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
    github?: { owner: string; repo: string; issueNumber: number; state?: string; syncedAt?: string };
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
    ...(p.github ? { github: p.github } : {}),
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

const KEY_PREFIX: Record<string, string> = { pbi: 'PBI', sbi: 'SBI', project: 'PRJ', sprint: 'SP' };

/** Compact reference to a block (for dependency edges, etc.). */
function refBlock(row: { id: string; type: string; props: unknown }) {
  const p = (row.props ?? {}) as {
    title?: string;
    name?: string;
    status?: string;
    number?: number;
  };
  const prefix = KEY_PREFIX[row.type];
  return {
    id: row.id,
    type: row.type,
    ...(prefix && typeof p.number === 'number' ? { key: `${prefix}-${p.number}` } : {}),
    title: p.title ?? p.name ?? 'Untitled',
    ...(p.status ? { status: p.status } : {}),
  };
}

/**
 * Mention → notification fan-out for a new comment. Mirrors the API's
 * fanoutMentionNotifications: only workspace members are notified, the
 * author never notifies themselves.
 */
async function fanoutMentions(
  ctx: ToolContext,
  args: { blockId: string; commentId: string; mentions: string[]; body: string },
): Promise<void> {
  if (args.mentions.length === 0) return;
  const targets = await ctx.db
    .select({ userId: schema.workspaceMember.userId })
    .from(schema.workspaceMember)
    .where(
      and(
        eq(schema.workspaceMember.workspaceId, ctx.workspaceId),
        inArray(schema.workspaceMember.userId, args.mentions),
      ),
    );
  const recipients = targets.map((t) => t.userId).filter((uid) => uid !== ctx.userId);
  if (recipients.length === 0) return;

  const [actor] = await ctx.db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.userId))
    .limit(1);
  const actorName = actor?.name ?? 'Someone';
  const snippet = args.body.slice(0, 140);
  const rows = recipients.map((recipientId) => ({
    id: ulid(),
    workspaceId: ctx.workspaceId,
    recipientId,
    actorUserId: ctx.userId,
    kind: 'mention',
    blockId: args.blockId,
    commentId: args.commentId,
    body: `${actorName} さんからメンション：${snippet}`,
  }));
  await ctx.db.insert(schema.notification).values(rows);
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
