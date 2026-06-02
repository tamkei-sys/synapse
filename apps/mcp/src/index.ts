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

import { record as recordAudit } from './audit.js';
import { resolveApiToken } from './auth.js';
import { createDb } from './db.js';
import { loadEnv } from './env.js';
import {
  addComment,
  addCommentSchema,
  addDependency,
  addDependencySchema,
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
  type ToolContext,
} from './tools.js';

const SERVICE_NAME = 'synapse-mcp';

async function main(): Promise<void> {
  const env = loadEnv();
  const db = createDb(env.databaseUrl);

  const resolved = await resolveApiToken(db, env.apiToken);
  if (!resolved) {
    // Print to stderr; stdout is reserved for the MCP JSON-RPC channel.
    console.error(`[${SERVICE_NAME}] invalid or expired SYNAPSE_API_TOKEN`);
    process.exit(1);
  }
  const ctx: ToolContext = {
    db,
    workspaceId: resolved.workspaceId,
    userId: resolved.userId,
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
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const name = req.params.name;
    const rawArgs = req.params.arguments ?? {};

    try {
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
    case 'synapse_search':
      return searchWorkspace(ctx, searchSchema.parse(args));
    case 'synapse_resolve_key':
      return resolveKey(ctx, resolveKeySchema.parse(args));
    default:
      throw new ToolError('INVALID', `Unknown tool: ${name}`);
  }
}

main().catch((err) => {
  console.error(`[${SERVICE_NAME}] fatal:`, err);
  process.exit(1);
});
