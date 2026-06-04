/**
 * SYNAPSE MCP server (stdio transport).
 *
 * cc spawns this binary, hands us a workspace-scoped API token via
 * `SYNAPSE_API_TOKEN`, and talks JSON-RPC over stdin/stdout. We
 * never accept input from anywhere else.
 *
 * Boot sequence:
 *   1. Read env (DATABASE_URL + SYNAPSE_API_TOKEN).
 *   2. Resolve the token to a (workspace, user). Refuse to start
 *      otherwise — failing closed is the only safe default.
 *   3. Register tools and connect the stdio transport.
 *
 * Every tool dispatch is wrapped in `recordAudit` so workspace owners
 * have a trail (CLAUDE.md §6 "every tool invocation produces an audit
 * log").
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

import { createServiceCaller, type Env } from '@synapse/api/server';

import { record as recordAudit } from './audit.js';
import { hasScope, resolveApiToken } from './auth.js';
import { createDb } from './db.js';
import { loadEnv } from './env.js';
import {
  addComment,
  addCommentSchema,
  addDependency,
  addDependencySchema,
  auditLog,
  auditLogSchema,
  createPbi,
  createPbiSchema,
  createProject,
  createProjectSchema,
  createSbi,
  createSbiSchema,
  createSprint,
  createSprintSchema,
  getOverview,
  getOverviewSchema,
  getPbi,
  getPbiSchema,
  listComments,
  listCommentsSchema,
  listDependencies,
  listDependenciesSchema,
  listPbis,
  listPbisSchema,
  listProjects,
  listProjectsSchema,
  listSbis,
  listSbisSchema,
  listSprints,
  listSprintsSchema,
  removeDependency,
  removeDependencySchema,
  resolveKey,
  resolveKeySchema,
  searchSchema,
  searchWorkspace,
  sprintMetrics,
  sprintMetricsSchema,
  ToolError,
  updatePbi,
  updatePbiSchema,
  updatePbiStatus,
  updatePbiStatusSchema,
  updateProject,
  updateProjectSchema,
  updateSbi,
  updateSbiSchema,
  updateSprint,
  updateSprintSchema,
  // Docs / pages (PBI: MCP page tools)
  createPage,
  createPageSchema,
  getPage,
  getPageSchema,
  listPages,
  listPagesSchema,
  updatePageTitle,
  updatePageTitleSchema,
  movePage,
  movePageSchema,
  trashPage,
  trashPageSchema,
  restorePage,
  restorePageSchema,
  appendDoc,
  appendDocSchema,
  setDoc,
  setDocSchema,
  linkGithubIssue,
  linkGithubIssueSchema,
  unlinkGithubIssue,
  unlinkGithubIssueSchema,
  resolveComment,
  resolveCommentSchema,
  reactComment,
  reactCommentSchema,
  deleteComment,
  deleteCommentSchema,
  type ToolContext,
} from './tools.js';

const SERVICE_NAME = 'synapse-mcp';

// ---- scope enforcement (PBI-103) --------------------------------------------
// Token scopes: 'read' | 'write_pbi' | 'write_comment' | 'admin'. 'write' is a
// legacy super-write scope (predates the granular split) — accepted for all
// writes for back-compat. 'admin' passes everything (see hasScope).
const WRITE_PBI_TOOLS = new Set<string>([
  'synapse_create_pbi',
  'synapse_update_pbi',
  'synapse_update_pbi_status',
  'synapse_create_sbi',
  'synapse_update_sbi',
  'synapse_create_project',
  'synapse_update_project',
  'synapse_create_sprint',
  'synapse_update_sprint',
  'synapse_add_dependency',
  'synapse_remove_dependency',
  'synapse_link_github_issue',
  'synapse_unlink_github_issue',
]);
const WRITE_COMMENT_TOOLS = new Set<string>([
  'synapse_add_comment',
  'synapse_resolve_comment',
  'synapse_react_comment',
  'synapse_delete_comment',
]);
// Page (Docs) write tools — gated by the 'write_page' token scope.
// (PBI: MCP page tools)
const WRITE_PAGE_TOOLS = new Set<string>([
  'synapse_create_page',
  'synapse_update_page_title',
  'synapse_move_page',
  'synapse_trash_page',
  'synapse_restore_page',
  'synapse_append_doc',
  'synapse_set_doc',
]);
const DESTRUCTIVE_TOOLS = new Set<string>([
  'synapse_update_pbi_status',
  'synapse_remove_dependency',
  'synapse_unlink_github_issue',
  'synapse_delete_comment',
  'synapse_trash_page',
  'synapse_set_doc',
]);

function isWriteTool(tool: string): boolean {
  return WRITE_PBI_TOOLS.has(tool) || WRITE_COMMENT_TOOLS.has(tool) || WRITE_PAGE_TOOLS.has(tool);
}

function requiredScopes(tool: string): string[] {
  if (WRITE_PBI_TOOLS.has(tool)) return ['write_pbi', 'write'];
  if (WRITE_COMMENT_TOOLS.has(tool)) return ['write_comment', 'write'];
  if (WRITE_PAGE_TOOLS.has(tool)) return ['write_page', 'write'];
  return ['read', 'write', 'write_pbi', 'write_comment', 'write_page'];
}

async function main(): Promise<void> {
  const env = loadEnv();
  const db = createDb(env.databaseUrl);

  const resolved = await resolveApiToken(db, env.apiToken);
  if (!resolved) {
    // Print to stderr; stdout is reserved for the MCP JSON-RPC channel.
    console.error(`[${SERVICE_NAME}] invalid or expired SYNAPSE_API_TOKEN`);
    process.exit(1);
  }
  // In-process tRPC caller bound to the resolved actor. Page tools reuse the
  // API's block procedures through this. BETTER_AUTH_* are never read by those
  // procedures (auth is stubbed inside createServiceCaller), so placeholders
  // are safe; Typesense coords are forwarded when present so created pages get
  // indexed.
  const apiEnv: Env = {
    DATABASE_URL: env.databaseUrl,
    BETTER_AUTH_URL: '',
    BETTER_AUTH_SECRET: '',
    WEB_ORIGIN: '',
    ...(env.typesenseUrl ? { TYPESENSE_URL: env.typesenseUrl } : {}),
    ...(env.typesenseApiKey ? { TYPESENSE_API_KEY: env.typesenseApiKey } : {}),
  };
  const caller = createServiceCaller({ db, env: apiEnv, actorUserId: resolved.userId });

  const ctx: ToolContext = {
    db,
    workspaceId: resolved.workspaceId,
    userId: resolved.userId,
    caller,
    ...(env.syncInternalUrl && env.syncInternalSecret
      ? { docWrite: { url: env.syncInternalUrl, secret: env.syncInternalSecret } }
      : {}),
  };
  const auditCtx = { db, ...resolved };

  const server = new Server(
    { name: SERVICE_NAME, version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'synapse_list_pbis',
        description: 'List PBIs in the current workspace, optionally filtered by status.',
        inputSchema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['backlog', 'ready', 'in_progress', 'review', 'done'],
            },
          },
        },
      },
      {
        name: 'synapse_get_pbi',
        description: 'Fetch a single PBI by id.',
        inputSchema: {
          type: 'object',
          required: ['pbiId'],
          properties: { pbiId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_create_pbi',
        description: 'Create a new PBI in the workspace. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string' },
            status: {
              type: 'string',
              enum: ['backlog', 'ready', 'in_progress', 'review', 'done'],
            },
            priority: { type: 'string', enum: ['must', 'should', 'could', 'wont'] },
            estimate: { type: 'integer', enum: [1, 2, 3, 5, 8, 13, 21] },
            storyPoints: { type: 'integer', minimum: 0, maximum: 100 },
            projectId: { type: 'string', description: 'Parent project block id (PRJ).' },
            sprintId: { type: 'string', description: 'Parent sprint block id (SP).' },
            dueDate: { type: 'string', description: 'ISO date (YYYY-MM-DD).' },
          },
        },
      },
      {
        name: 'synapse_update_pbi',
        description:
          'Patch a PBI (title, status, priority, estimate, story points, project/sprint links, assignees, due date). Send a field as null to clear it. Write tool — cc should confirm.',
        inputSchema: {
          type: 'object',
          required: ['pbiId', 'patch'],
          properties: {
            pbiId: { type: 'string' },
            patch: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['backlog', 'ready', 'in_progress', 'review', 'done'],
                },
                priority: { type: 'string', enum: ['must', 'should', 'could', 'wont'] },
                estimate: { type: 'integer', enum: [1, 2, 3, 5, 8, 13, 21] },
                storyPoints: { type: ['integer', 'null'], minimum: 0, maximum: 100 },
                projectId: { type: ['string', 'null'] },
                sprintId: { type: ['string', 'null'] },
                dueDate: { type: ['string', 'null'] },
                assigneeIds: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      {
        name: 'synapse_update_pbi_status',
        description: 'Update the status of a PBI. Destructive — cc should confirm with the user.',
        inputSchema: {
          type: 'object',
          required: ['pbiId', 'status'],
          properties: {
            pbiId: { type: 'string' },
            status: {
              type: 'string',
              enum: ['backlog', 'ready', 'in_progress', 'review', 'done'],
            },
          },
        },
      },
      {
        name: 'synapse_get_overview',
        description:
          'Summarize the workspace: counts of projects, sprints, PBIs, and SBIs, plus PBI/SBI status breakdowns. Call this first to orient.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_list_projects',
        description:
          'List all projects in the workspace with key (PRJ-n), name, status, priority, and dates.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_list_sprints',
        description:
          'List all sprints in the workspace with key (SP-n), name, status, start/end dates, and goal.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_list_sbis',
        description: 'List the SBIs (sub-tasks) under a given PBI, by the PBI block id.',
        inputSchema: {
          type: 'object',
          required: ['pbiId'],
          properties: { pbiId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_create_sbi',
        description: 'Create an SBI (sub-task, sized in hours) under a PBI. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['pbiId', 'title'],
          properties: {
            pbiId: { type: 'string' },
            title: { type: 'string' },
            estimateHours: { type: 'number', minimum: 0, maximum: 200 },
            assigneeId: { type: 'string' },
          },
        },
      },
      {
        name: 'synapse_update_sbi',
        description:
          'Patch an SBI (title, status, assignee, estimate/actual hours, due date). status→in_progress/done auto-stamps started/completed. Send null to clear a field. Write tool — cc should confirm.',
        inputSchema: {
          type: 'object',
          required: ['sbiId', 'patch'],
          properties: {
            sbiId: { type: 'string' },
            patch: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['todo', 'in_progress', 'review', 'done', 'archived'],
                },
                assigneeId: { type: ['string', 'null'] },
                estimateHours: { type: ['number', 'null'], minimum: 0, maximum: 200 },
                actualHours: { type: ['number', 'null'], minimum: 0, maximum: 2000 },
                dueDate: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
      {
        name: 'synapse_create_project',
        description: 'Create a project (PRJ-n). Write tool.',
        inputSchema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            status: {
              type: 'string',
              enum: [
                'backlog',
                'planned',
                'in_progress',
                'paused',
                'review',
                'done',
                'cancelled',
                'archived',
              ],
            },
            priority: { type: 'string', enum: ['must', 'should', 'could', 'wont'] },
          },
        },
      },
      {
        name: 'synapse_update_project',
        description:
          'Patch a project (name, status, priority, owner, start/planned/completed dates). Send null to clear. Write tool — cc should confirm.',
        inputSchema: {
          type: 'object',
          required: ['projectId', 'patch'],
          properties: {
            projectId: { type: 'string' },
            patch: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: {
                  type: 'string',
                  enum: [
                    'backlog',
                    'planned',
                    'in_progress',
                    'paused',
                    'review',
                    'done',
                    'cancelled',
                    'archived',
                  ],
                },
                priority: { type: 'string', enum: ['must', 'should', 'could', 'wont'] },
                ownerId: { type: ['string', 'null'] },
                startDate: { type: ['string', 'null'] },
                plannedDate: { type: ['string', 'null'] },
                completedDate: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
      {
        name: 'synapse_create_sprint',
        description:
          'Create a sprint (SP-n). Defaults to a two-week window from today when dates are omitted. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            startDate: { type: 'string', description: 'ISO date (YYYY-MM-DD).' },
            endDate: { type: 'string', description: 'ISO date (YYYY-MM-DD).' },
            goal: { type: 'string' },
            status: { type: 'string', enum: ['planning', 'active', 'review', 'done'] },
          },
        },
      },
      {
        name: 'synapse_update_sprint',
        description:
          'Patch a sprint (name, status, start/end dates, goal). startDate must be ≤ endDate. Send goal null to clear. Write tool — cc should confirm.',
        inputSchema: {
          type: 'object',
          required: ['sprintId', 'patch'],
          properties: {
            sprintId: { type: 'string' },
            patch: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                status: { type: 'string', enum: ['planning', 'active', 'review', 'done'] },
                startDate: { type: 'string' },
                endDate: { type: 'string' },
                goal: { type: ['string', 'null'] },
              },
            },
          },
        },
      },
      {
        name: 'synapse_sprint_metrics',
        description:
          'Sprint progress summary: total/completed/remaining hours, PBI counts, and percent complete.',
        inputSchema: {
          type: 'object',
          required: ['sprintId'],
          properties: { sprintId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_add_dependency',
        description:
          'Record that one block is blocked by another (blockId is blocked by dependsOnId). Both must be in the workspace. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['blockId', 'dependsOnId'],
          properties: {
            blockId: { type: 'string' },
            dependsOnId: { type: 'string' },
            note: { type: 'string' },
          },
        },
      },
      {
        name: 'synapse_remove_dependency',
        description: 'Remove a dependency edge (blockId blocked by dependsOnId). Write tool.',
        inputSchema: {
          type: 'object',
          required: ['blockId', 'dependsOnId'],
          properties: { blockId: { type: 'string' }, dependsOnId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_list_dependencies',
        description:
          "List a block's dependency edges: blockedBy (what it waits on) and blocks (what waits on it), each resolved to key/title/status.",
        inputSchema: {
          type: 'object',
          required: ['blockId'],
          properties: { blockId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_add_comment',
        description:
          'Add a comment to any block (PBI, page, project, etc.). `@user-id` mentions fan out as notifications. Write tool — cc should confirm.',
        inputSchema: {
          type: 'object',
          required: ['blockId', 'body'],
          properties: { blockId: { type: 'string' }, body: { type: 'string' } },
        },
      },
      {
        name: 'synapse_list_comments',
        description:
          'List comments on a block (oldest first) with author name, resolved flag, and mentions.',
        inputSchema: {
          type: 'object',
          required: ['blockId'],
          properties: { blockId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_resolve_comment',
        description:
          'Mark a comment thread resolved or unresolved (resolved defaults to true). Write tool.',
        inputSchema: {
          type: 'object',
          required: ['commentId'],
          properties: {
            commentId: { type: 'string' },
            resolved: {
              type: 'boolean',
              description: 'true to resolve (default), false to reopen.',
            },
          },
        },
      },
      {
        name: 'synapse_react_comment',
        description:
          'Toggle an emoji reaction on a comment (one of 👍 🎉 👀 ✅ 🤔). Adds it if absent, removes it if present. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['commentId', 'emoji'],
          properties: {
            commentId: { type: 'string' },
            emoji: { type: 'string', enum: ['👍', '🎉', '👀', '✅', '🤔'] },
          },
        },
      },
      {
        name: 'synapse_delete_comment',
        description:
          'Delete a comment (soft delete). Only the author or a workspace admin/owner may delete. Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['commentId'],
          properties: { commentId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_search',
        description:
          'Substring search across the workspace by block title/name/body. Optional type filter (pbi, sbi, project, sprint, page, …).',
        inputSchema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string' },
            types: { type: 'array', items: { type: 'string' } },
            limit: { type: 'integer', minimum: 1, maximum: 50 },
          },
        },
      },
      {
        name: 'synapse_resolve_key',
        description:
          'Resolve a human key (PBI-42, SBI-161, PRJ-9, SP-3) to its block with full detail.',
        inputSchema: {
          type: 'object',
          required: ['key'],
          properties: { key: { type: 'string' } },
        },
      },
      {
        name: 'synapse_audit_log',
        description:
          'List recent MCP tool invocations for the workspace (tool, ok/error, actor, time). Read-only.',
        inputSchema: {
          type: 'object',
          properties: { limit: { type: 'integer', minimum: 1, maximum: 100 } },
        },
      },
      // ---- Docs / pages (PBI: MCP page tools) -------------------------------
      {
        name: 'synapse_create_page',
        description:
          'Create a new doc/page in the workspace, seeded empty. Returns page metadata. Write tool. Editing the page body is not yet available over MCP.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Page title. Defaults to "Untitled".' },
            parentPageId: {
              type: 'string',
              description: 'Optional parent page id — creates this as a sub-page.',
            },
          },
        },
      },
      {
        name: 'synapse_get_page',
        description: 'Fetch a single page by id (metadata: title, parentId). Read-only.',
        inputSchema: {
          type: 'object',
          required: ['pageId'],
          properties: { pageId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_list_pages',
        description: 'List all pages in the workspace (id, title, parentId). Read-only.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_update_page_title',
        description: 'Rename a page. Write tool. Does not touch the page body.',
        inputSchema: {
          type: 'object',
          required: ['pageId', 'title'],
          properties: { pageId: { type: 'string' }, title: { type: 'string' } },
        },
      },
      {
        name: 'synapse_move_page',
        description:
          'Move a page under a new parent (or to the root when newParentId is null/omitted); the page is appended to the end of the target. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['pageId'],
          properties: {
            pageId: { type: 'string' },
            newParentId: {
              type: ['string', 'null'],
              description: 'Target parent page id, or null/omit for the workspace root.',
            },
          },
        },
      },
      {
        name: 'synapse_trash_page',
        description:
          'Move a page (and its sub-pages) to the trash — a reversible soft-delete. Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['pageId'],
          properties: { pageId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_restore_page',
        description: 'Restore a trashed page (and its sub-pages). Write tool.',
        inputSchema: {
          type: 'object',
          required: ['pageId'],
          properties: { pageId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_append_doc',
        description:
          'Append markdown to the END of a page body (its rich-text content); connected editors see it live. Write tool. (Create the page first with synapse_create_page if needed.)',
        inputSchema: {
          type: 'object',
          required: ['pageId', 'markdown'],
          properties: {
            pageId: { type: 'string' },
            markdown: {
              type: 'string',
              description:
                'Markdown — headings, bullet/ordered/task lists, code blocks, quotes, bold/italic/strike/code/links.',
            },
          },
        },
      },
      {
        name: 'synapse_set_doc',
        description:
          'Replace the ENTIRE page body with the given markdown. Write tool, destructive — the previous body is discarded.',
        inputSchema: {
          type: 'object',
          required: ['pageId', 'markdown'],
          properties: {
            pageId: { type: 'string' },
            markdown: { type: 'string', description: 'Markdown for the new body (see synapse_append_doc).' },
          },
        },
      },
      // ---- GitHub Issue linking (PBI-122) -----------------------------------
      {
        name: 'synapse_link_github_issue',
        description:
          'Link a PBI to a GitHub issue (owner/repo/issueNumber). Records the reference on the PBI and fires an outbound sync. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['pbiId', 'owner', 'repo', 'issueNumber'],
          properties: {
            pbiId: { type: 'string' },
            owner: { type: 'string', description: 'GitHub repo owner (user or org).' },
            repo: { type: 'string', description: 'GitHub repository name.' },
            issueNumber: { type: 'integer', minimum: 1 },
            state: { type: 'string', enum: ['open', 'closed'] },
          },
        },
      },
      {
        name: 'synapse_unlink_github_issue',
        description:
          'Remove the GitHub issue link from a PBI (the issue itself is not deleted). Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['pbiId'],
          properties: { pbiId: { type: 'string' } },
        },
      },
    ].map((tool) => ({
      // readOnlyHint / destructiveHint let cc decide when to confirm before
      // running a tool (CLAUDE.md §6 "write tools require a confirmation flow").
      ...tool,
      annotations: {
        readOnlyHint: !isWriteTool(tool.name),
        ...(DESTRUCTIVE_TOOLS.has(tool.name) ? { destructiveHint: true } : {}),
      },
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const rawArgs = req.params.arguments ?? {};

    try {
      if (!hasScope(resolved, requiredScopes(name))) {
        throw new ToolError(
          'FORBIDDEN',
          `Token lacks the scope required for ${name} (needs one of: ${requiredScopes(name).join(', ')}).`,
        );
      }
      const data = await dispatch(ctx, name, rawArgs);
      await recordAudit(auditCtx, { tool: name, args: rawArgs, result: 'ok' });
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordAudit(auditCtx, {
        tool: name,
        args: rawArgs,
        result: 'error',
        errorMessage: message,
      });
      return {
        isError: true,
        content: [{ type: 'text', text: message }],
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`[${SERVICE_NAME}] ready (workspace ${resolved.workspaceId})`);
}

async function dispatch(
  ctx: ToolContext,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case 'synapse_list_pbis':
      return listPbis(ctx, listPbisSchema.parse(args));
    case 'synapse_get_pbi':
      return getPbi(ctx, getPbiSchema.parse(args));
    case 'synapse_create_pbi':
      return createPbi(ctx, createPbiSchema.parse(args));
    case 'synapse_update_pbi_status':
      return updatePbiStatus(ctx, updatePbiStatusSchema.parse(args));
    case 'synapse_update_pbi':
      return updatePbi(ctx, updatePbiSchema.parse(args));
    case 'synapse_get_overview':
      return getOverview(ctx, getOverviewSchema.parse(args));
    case 'synapse_list_projects':
      return listProjects(ctx, listProjectsSchema.parse(args));
    case 'synapse_list_sprints':
      return listSprints(ctx, listSprintsSchema.parse(args));
    case 'synapse_list_sbis':
      return listSbis(ctx, listSbisSchema.parse(args));
    case 'synapse_create_sbi':
      return createSbi(ctx, createSbiSchema.parse(args));
    case 'synapse_update_sbi':
      return updateSbi(ctx, updateSbiSchema.parse(args));
    case 'synapse_create_project':
      return createProject(ctx, createProjectSchema.parse(args));
    case 'synapse_update_project':
      return updateProject(ctx, updateProjectSchema.parse(args));
    case 'synapse_create_sprint':
      return createSprint(ctx, createSprintSchema.parse(args));
    case 'synapse_update_sprint':
      return updateSprint(ctx, updateSprintSchema.parse(args));
    case 'synapse_sprint_metrics':
      return sprintMetrics(ctx, sprintMetricsSchema.parse(args));
    case 'synapse_add_dependency':
      return addDependency(ctx, addDependencySchema.parse(args));
    case 'synapse_remove_dependency':
      return removeDependency(ctx, removeDependencySchema.parse(args));
    case 'synapse_list_dependencies':
      return listDependencies(ctx, listDependenciesSchema.parse(args));
    case 'synapse_add_comment':
      return addComment(ctx, addCommentSchema.parse(args));
    case 'synapse_list_comments':
      return listComments(ctx, listCommentsSchema.parse(args));
    case 'synapse_resolve_comment':
      return resolveComment(ctx, resolveCommentSchema.parse(args));
    case 'synapse_react_comment':
      return reactComment(ctx, reactCommentSchema.parse(args));
    case 'synapse_delete_comment':
      return deleteComment(ctx, deleteCommentSchema.parse(args));
    case 'synapse_search':
      return searchWorkspace(ctx, searchSchema.parse(args));
    case 'synapse_resolve_key':
      return resolveKey(ctx, resolveKeySchema.parse(args));
    case 'synapse_audit_log':
      return auditLog(ctx, auditLogSchema.parse(args));
    // ---- Docs / pages (PBI: MCP page tools) ---------------------------------
    case 'synapse_create_page':
      return createPage(ctx, createPageSchema.parse(args));
    case 'synapse_get_page':
      return getPage(ctx, getPageSchema.parse(args));
    case 'synapse_list_pages':
      return listPages(ctx, listPagesSchema.parse(args));
    case 'synapse_update_page_title':
      return updatePageTitle(ctx, updatePageTitleSchema.parse(args));
    case 'synapse_move_page':
      return movePage(ctx, movePageSchema.parse(args));
    case 'synapse_trash_page':
      return trashPage(ctx, trashPageSchema.parse(args));
    case 'synapse_restore_page':
      return restorePage(ctx, restorePageSchema.parse(args));
    case 'synapse_append_doc':
      return appendDoc(ctx, appendDocSchema.parse(args));
    case 'synapse_set_doc':
      return setDoc(ctx, setDocSchema.parse(args));
    // ---- GitHub Issue linking (PBI-122) -------------------------------------
    case 'synapse_link_github_issue':
      return linkGithubIssue(ctx, linkGithubIssueSchema.parse(args));
    case 'synapse_unlink_github_issue':
      return unlinkGithubIssue(ctx, unlinkGithubIssueSchema.parse(args));
    default:
      throw new ToolError('INVALID', `Unknown tool: ${name}`);
  }
}

main().catch((err) => {
  console.error(`[${SERVICE_NAME}] fatal:`, err);
  process.exit(1);
});
