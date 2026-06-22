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
import { createDb as createDbPool } from './db.js';
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
  uploadImage,
  uploadImageSchema,
  insertImage,
  insertImageSchema,
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
  toggleFavorite,
  toggleFavoriteSchema,
  listFavorites,
  listFavoritesSchema,
  isFavorite,
  isFavoriteSchema,
  fetchBookmark,
  fetchBookmarkSchema,
  createDb,
  createDbSchema,
  getDb,
  getDbSchema,
  listDbs,
  listDbsSchema,
  dbAddColumn,
  dbAddColumnSchema,
  dbUpdateColumn,
  dbUpdateColumnSchema,
  dbDeleteColumn,
  dbDeleteColumnSchema,
  dbAddRow,
  dbAddRowSchema,
  dbUpdateCell,
  dbUpdateCellSchema,
  dbReorderRows,
  dbReorderRowsSchema,
  dbDeleteRow,
  dbDeleteRowSchema,
  listChannels,
  listChannelsSchema,
  createChannel,
  createChannelSchema,
  listMessages,
  listMessagesSchema,
  sendMessage,
  sendMessageSchema,
  deleteMessage,
  deleteMessageSchema,
  reactMessage,
  reactMessageSchema,
  listNotifications,
  listNotificationsSchema,
  unreadCount,
  unreadCountSchema,
  markNotificationRead,
  markNotificationReadSchema,
  markAllNotificationsRead,
  markAllNotificationsReadSchema,
  createReminder,
  createReminderSchema,
  snoozeReminder,
  snoozeReminderSchema,
  listReminders,
  listRemindersSchema,
  deleteReminder,
  deleteReminderSchema,
  listMembers,
  listMembersSchema,
  listInvitations,
  listInvitationsSchema,
  inviteMember,
  inviteMemberSchema,
  cancelInvitation,
  cancelInvitationSchema,
  setMemberRole,
  setMemberRoleSchema,
  removeMember,
  removeMemberSchema,
  aiAsk,
  aiAskSchema,
  aiTransform,
  aiTransformSchema,
  aiSummarizePage,
  aiSummarizePageSchema,
  aiSynthesizePbi,
  aiSynthesizePbiSchema,
  aiSummarizeSprint,
  aiSummarizeSprintSchema,
  startCcForPbi,
  startCcForPbiSchema,
  listCcSessions,
  listCcSessionsSchema,
  getCcForPbi,
  getCcForPbiSchema,
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
// The two doc-body tools also write project/sprint/PBI/SBI bodies (ADR-0011
// amendment) but stay under 'write_page': body editing is the "documents"
// capability, while PM metadata (status etc.) remains under 'write_pbi'.
const WRITE_PAGE_TOOLS = new Set<string>([
  'synapse_create_page',
  'synapse_update_page_title',
  'synapse_move_page',
  'synapse_trash_page',
  'synapse_restore_page',
  'synapse_append_doc',
  'synapse_set_doc',
  'synapse_upload_image',
  'synapse_insert_image',
]);
// Favorite (per-user page bookmark) write tools — gated by 'write_favorite'.
// (PBI-126) bookmark.fetch / list / is are read-only and not listed here.
const WRITE_FAVORITE_TOOLS = new Set<string>(['synapse_toggle_favorite']);
// User-defined DB write tools — gated by 'write_db'. (PBI-121)
// get_db / list_dbs are read-only and not listed here.
const WRITE_DB_TOOLS = new Set<string>([
  'synapse_create_db',
  'synapse_db_add_column',
  'synapse_db_update_column',
  'synapse_db_delete_column',
  'synapse_db_add_row',
  'synapse_db_update_cell',
  'synapse_db_reorder_rows',
  'synapse_db_delete_row',
]);
// Chat write tools — gated by 'write_chat'. (PBI-123)
// list_channels / list_messages are read-only and not listed here.
const WRITE_CHAT_TOOLS = new Set<string>([
  'synapse_create_channel',
  'synapse_send_message',
  'synapse_delete_message',
  'synapse_react_message',
]);
// Inbox (notification + reminder) write tools — gated by 'write_inbox'. (PBI-124)
// list_notifications / unread_count / list_reminders are read-only.
const WRITE_INBOX_TOOLS = new Set<string>([
  'synapse_mark_notification_read',
  'synapse_mark_all_notifications_read',
  'synapse_create_reminder',
  'synapse_snooze_reminder',
  'synapse_delete_reminder',
]);
// Workspace member-admin write tools — gated by 'write_member'. (PBI-125)
// list_members / list_invitations are read-only.
const WRITE_MEMBER_TOOLS = new Set<string>([
  'synapse_invite_member',
  'synapse_cancel_invitation',
  'synapse_set_member_role',
  'synapse_remove_member',
]);
// AI tools — gated by 'write_ai' (every call may incur Anthropic cost). (PBI-128)
const WRITE_AI_TOOLS = new Set<string>([
  'synapse_ai_ask',
  'synapse_ai_transform',
  'synapse_ai_summarize_page',
  'synapse_ai_synthesize_pbi',
  'synapse_ai_summarize_sprint',
]);
// cc (headless Claude Code) write tools — gated by 'write_cc'. (PBI-129)
// list_cc_sessions / get_cc_for_pbi are read-only.
const WRITE_CC_TOOLS = new Set<string>(['synapse_start_cc_for_pbi']);
const DESTRUCTIVE_TOOLS = new Set<string>([
  'synapse_update_pbi_status',
  'synapse_remove_dependency',
  'synapse_unlink_github_issue',
  'synapse_delete_comment',
  'synapse_db_delete_column',
  'synapse_db_delete_row',
  'synapse_delete_message',
  'synapse_delete_reminder',
  'synapse_set_member_role',
  'synapse_remove_member',
  'synapse_start_cc_for_pbi',
  'synapse_trash_page',
  'synapse_set_doc',
]);

function isWriteTool(tool: string): boolean {
  return (
    WRITE_PBI_TOOLS.has(tool) ||
    WRITE_COMMENT_TOOLS.has(tool) ||
    WRITE_PAGE_TOOLS.has(tool) ||
    WRITE_FAVORITE_TOOLS.has(tool) ||
    WRITE_DB_TOOLS.has(tool) ||
    WRITE_CHAT_TOOLS.has(tool) ||
    WRITE_INBOX_TOOLS.has(tool) ||
    WRITE_MEMBER_TOOLS.has(tool) ||
    WRITE_AI_TOOLS.has(tool) ||
    WRITE_CC_TOOLS.has(tool)
  );
}

function requiredScopes(tool: string): string[] {
  if (WRITE_PBI_TOOLS.has(tool)) return ['write_pbi', 'write'];
  if (WRITE_COMMENT_TOOLS.has(tool)) return ['write_comment', 'write'];
  if (WRITE_PAGE_TOOLS.has(tool)) return ['write_page', 'write'];
  if (WRITE_FAVORITE_TOOLS.has(tool)) return ['write_favorite', 'write'];
  if (WRITE_DB_TOOLS.has(tool)) return ['write_db', 'write'];
  if (WRITE_CHAT_TOOLS.has(tool)) return ['write_chat', 'write'];
  if (WRITE_INBOX_TOOLS.has(tool)) return ['write_inbox', 'write'];
  if (WRITE_MEMBER_TOOLS.has(tool)) return ['write_member', 'write'];
  if (WRITE_AI_TOOLS.has(tool)) return ['write_ai', 'write'];
  if (WRITE_CC_TOOLS.has(tool)) return ['write_cc', 'write'];
  return [
    'read',
    'write',
    'write_pbi',
    'write_comment',
    'write_page',
    'write_favorite',
    'write_db',
    'write_chat',
    'write_inbox',
    'write_member',
    'write_ai',
    'write_cc',
  ];
}

// JSON Schema fragments for a DB column and a cell value, reused across the db
// tool definitions below. (PBI-121) The column's strict per-kind validation is
// enforced by dbColumnSchema inside the procedure; here we only require the
// common id/kind/name and allow the rest through.
const DB_COLUMN_SCHEMA = {
  type: 'object',
  required: ['id', 'kind', 'name'],
  properties: {
    id: { type: 'string' },
    kind: {
      type: 'string',
      enum: ['text', 'number', 'checkbox', 'select', 'date', 'relation', 'rollup'],
    },
    name: { type: 'string' },
  },
  additionalProperties: true,
};
const DB_CELL_VALUE_SCHEMA = {
  type: ['string', 'number', 'boolean', 'array', 'null'],
  items: { type: 'string' },
};

async function main(): Promise<void> {
  const env = loadEnv();
  const db = createDbPool(env.databaseUrl);

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
          'Append markdown to the END of a document body — a page, or the doc body of a project / sprint / PBI / SBI (what its detail view shows); connected editors see it live. Write tool. (For pages, create one first with synapse_create_page if needed.)',
        inputSchema: {
          type: 'object',
          required: ['blockId', 'markdown'],
          properties: {
            blockId: {
              type: 'string',
              description:
                'Target block id — a page, project, sprint, PBI, or SBI. (`pageId` is accepted as a legacy alias.)',
            },
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
          'Replace the ENTIRE document body (page / project / sprint / PBI / SBI) with the given markdown. Write tool, destructive — the previous body is discarded.',
        inputSchema: {
          type: 'object',
          required: ['blockId', 'markdown'],
          properties: {
            blockId: { type: 'string', description: 'Target block id (see synapse_append_doc).' },
            markdown: { type: 'string', description: 'Markdown for the new body (see synapse_append_doc).' },
          },
        },
      },
      // ---- Image upload & insertion (PBI-179) -------------------------------
      {
        name: 'synapse_upload_image',
        description:
          'Upload an image and return its embeddable URL. Pass exactly one of: `path` (local file on disk), `dataUrl` ("data:<mime>;base64,…"), or `bytes` (raw base64; requires `mime`). Returns { url, bytes, mime, storage, key }. R2 is used when the API has MEDIA_BUCKET bound; otherwise a data:URL is returned so dev still works end-to-end. Write tool.',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Local filesystem path to read (preferred when Claude Code has the file on disk).',
            },
            dataUrl: {
              type: 'string',
              description: '"data:<mime>;base64,<payload>" string (e.g. a pasted screenshot).',
            },
            bytes: {
              type: 'string',
              description: 'Raw base64 payload (no "data:" prefix). Requires `mime`.',
            },
            filename: {
              type: 'string',
              description: 'Optional filename. Defaults to "image" or the path basename.',
            },
            mime: {
              type: 'string',
              description: 'Optional MIME type. Inferred from dataUrl / path extension when omitted; REQUIRED when passing `bytes`.',
            },
          },
        },
      },
      {
        name: 'synapse_insert_image',
        description:
          'Upload an image AND append it to a document body in one shot — the target is a page / project / sprint / PBI / SBI by `blockId`. Same payload variants as `synapse_upload_image` (path / dataUrl / bytes — exactly one). Inserts as a markdown image with the given `alt`. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['blockId'],
          properties: {
            blockId: {
              type: 'string',
              description: 'Target block id (page / project / sprint / PBI / SBI). `pageId` accepted as a legacy alias.',
            },
            pageId: { type: 'string', description: 'Legacy alias for `blockId`.' },
            alt: { type: 'string', description: 'Optional alt text for the inserted image.' },
            path: { type: 'string', description: 'See synapse_upload_image.' },
            dataUrl: { type: 'string', description: 'See synapse_upload_image.' },
            bytes: { type: 'string', description: 'See synapse_upload_image.' },
            filename: { type: 'string', description: 'See synapse_upload_image.' },
            mime: { type: 'string', description: 'See synapse_upload_image.' },
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
      // ---- favorites & bookmarks (PBI-126) ----------------------------------
      {
        name: 'synapse_toggle_favorite',
        description:
          "Toggle a page in the caller's favorites (per-user). Returns the new favorited state. Write tool.",
        inputSchema: {
          type: 'object',
          required: ['pageId'],
          properties: { pageId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_list_favorites',
        description: "List the caller's favorite pages (pageId, title, icon). Read-only.",
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_is_favorite',
        description: "Check whether a page is in the caller's favorites. Read-only.",
        inputSchema: {
          type: 'object',
          required: ['pageId'],
          properties: { pageId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_fetch_bookmark',
        description:
          'Fetch Open Graph metadata (title, description, image, favicon, siteName) for a URL. Server-side and SSRF-guarded. Read-only — makes an outbound request to the given URL.',
        inputSchema: {
          type: 'object',
          required: ['url'],
          properties: {
            url: { type: 'string', description: 'http(s) URL to fetch OG metadata for.' },
          },
        },
      },
      // ---- user-defined DB / spreadsheet (PBI-121) --------------------------
      {
        name: 'synapse_create_db',
        description:
          'Create a user-defined database (spreadsheet/table). Omit columns for the defaults (text/number/checkbox/select/date). Write tool.',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'DB title; defaults to an untitled database.' },
            columns: {
              type: 'array',
              description: 'Optional column definitions; omit for the defaults.',
              items: DB_COLUMN_SCHEMA,
            },
          },
        },
      },
      {
        name: 'synapse_get_db',
        description:
          'Fetch a database: header, columns, all rows, plus resolved relations and rollups. Read-only.',
        inputSchema: {
          type: 'object',
          required: ['dbId'],
          properties: { dbId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_list_dbs',
        description: 'List the databases in the workspace (id, title, createdAt). Read-only.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_db_add_column',
        description: 'Append a column to a database. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['dbId', 'column'],
          properties: { dbId: { type: 'string' }, column: DB_COLUMN_SCHEMA },
        },
      },
      {
        name: 'synapse_db_update_column',
        description:
          'Update a column (rename or change kind). Changing the kind re-coerces every row cell and may be lossy. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['dbId', 'column'],
          properties: { dbId: { type: 'string' }, column: DB_COLUMN_SCHEMA },
        },
      },
      {
        name: 'synapse_db_delete_column',
        description:
          'Delete a column and drop that cell from every row (at least one column must remain). Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['dbId', 'columnId'],
          properties: { dbId: { type: 'string' }, columnId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_db_add_row',
        description:
          'Append a row to a database; optionally seed cell values (columnId → value). Write tool.',
        inputSchema: {
          type: 'object',
          required: ['dbId'],
          properties: {
            dbId: { type: 'string' },
            values: { type: 'object', additionalProperties: DB_CELL_VALUE_SCHEMA },
          },
        },
      },
      {
        name: 'synapse_db_update_cell',
        description: 'Set one cell (rowId + columnId). A null value clears the cell. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['rowId', 'columnId', 'value'],
          properties: {
            rowId: { type: 'string' },
            columnId: { type: 'string' },
            value: DB_CELL_VALUE_SCHEMA,
          },
        },
      },
      {
        name: 'synapse_db_reorder_rows',
        description: 'Reorder rows by passing the full ordered list of row ids. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['dbId', 'orderedRowIds'],
          properties: {
            dbId: { type: 'string' },
            orderedRowIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
      {
        name: 'synapse_db_delete_row',
        description:
          'Delete a row (hard delete — DB rows are not soft-deleted). Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['rowId'],
          properties: { rowId: { type: 'string' } },
        },
      },
      // ---- chat (PBI-123) ---------------------------------------------------
      {
        name: 'synapse_list_channels',
        description: 'List the chat channels in the workspace (id, name, description). Read-only.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_create_channel',
        description: 'Create a chat channel. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      {
        name: 'synapse_list_messages',
        description:
          'List recent messages in a channel (oldest-first after the limit), with author and reactions. Read-only.',
        inputSchema: {
          type: 'object',
          required: ['channelId'],
          properties: {
            channelId: { type: 'string' },
            limit: { type: 'integer', minimum: 1, maximum: 100 },
          },
        },
      },
      {
        name: 'synapse_send_message',
        description:
          'Post a message to a channel. Provide body and/or an attachment (at least one). @user-id mentions notify members. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['channelId'],
          properties: {
            channelId: { type: 'string' },
            body: { type: 'string', description: 'Message text (body or attachment required).' },
            attachment: {
              type: 'object',
              required: ['kind', 'url', 'name', 'mime'],
              properties: {
                kind: { type: 'string', enum: ['image', 'file'] },
                url: { type: 'string' },
                name: { type: 'string' },
                mime: { type: 'string' },
              },
            },
          },
        },
      },
      {
        name: 'synapse_delete_message',
        description:
          'Delete a chat message (soft delete). Only the author or a workspace admin/owner may delete. Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['messageId'],
          properties: { messageId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_react_message',
        description:
          'Toggle an emoji reaction on a chat message (one of 👍 🎉 👀 ✅ 🤔 ❤️). Write tool.',
        inputSchema: {
          type: 'object',
          required: ['messageId', 'emoji'],
          properties: {
            messageId: { type: 'string' },
            emoji: { type: 'string', enum: ['👍', '🎉', '👀', '✅', '🤔', '❤️'] },
          },
        },
      },
      // ---- notifications & reminders (PBI-124) ------------------------------
      {
        name: 'synapse_list_notifications',
        description:
          "List the caller's notifications (newest first; optionally unread-only). Read-only.",
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'integer', minimum: 1, maximum: 100 },
            unreadOnly: { type: 'boolean' },
          },
        },
      },
      {
        name: 'synapse_unread_count',
        description: "Count the caller's unread notifications. Read-only.",
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_mark_notification_read',
        description: 'Mark one notification as read. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['notificationId'],
          properties: { notificationId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_mark_all_notifications_read',
        description: "Mark all of the caller's unread notifications as read. Write tool.",
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_create_reminder',
        description:
          'Create a personal reminder on a block (page/PBI/etc.) at remindAt. Lands in the notification inbox. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['blockId', 'remindAt'],
          properties: {
            blockId: { type: 'string' },
            remindAt: {
              type: 'string',
              description: 'ISO 8601 datetime, e.g. 2026-06-10T09:00:00Z.',
            },
            body: { type: 'string' },
            recurrence: { type: 'string', enum: ['none', 'daily', 'weekly', 'monthly'] },
          },
        },
      },
      {
        name: 'synapse_snooze_reminder',
        description: 'Postpone a reminder by N minutes (re-arms it). Write tool.',
        inputSchema: {
          type: 'object',
          required: ['reminderId', 'minutes'],
          properties: {
            reminderId: { type: 'string' },
            minutes: { type: 'integer', minimum: 1, maximum: 43200 },
          },
        },
      },
      {
        name: 'synapse_list_reminders',
        description:
          "List the caller's reminders (soonest first), optionally for one block. Read-only.",
        inputSchema: {
          type: 'object',
          properties: { blockId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_delete_reminder',
        description: 'Cancel a reminder. Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['reminderId'],
          properties: { reminderId: { type: 'string' } },
        },
      },
      // ---- workspace member management (PBI-125) ----------------------------
      {
        name: 'synapse_list_members',
        description:
          'List the workspace members (userId, role, name, email, joinedAt). Read-only.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_list_invitations',
        description:
          'List the workspace invitations (id, email, role, status). Owner/admin only. Read-only.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_invite_member',
        description:
          'Invite someone to the workspace by email. Owner/admin only. Returns a ONE-TIME plaintext invitation token (never retrievable again) — share the invite link, do not log it. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'member', 'viewer'] },
          },
        },
      },
      {
        name: 'synapse_cancel_invitation',
        description: 'Revoke a pending workspace invitation. Owner/admin only. Write tool.',
        inputSchema: {
          type: 'object',
          required: ['invitationId'],
          properties: { invitationId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_set_member_role',
        description:
          "Change a member's role (owner/admin/member/viewer). Owner/admin only; the last owner can't be demoted. Write tool, destructive.",
        inputSchema: {
          type: 'object',
          required: ['userId', 'role'],
          properties: {
            userId: { type: 'string' },
            role: { type: 'string', enum: ['owner', 'admin', 'member', 'viewer'] },
          },
        },
      },
      {
        name: 'synapse_remove_member',
        description:
          "Remove a member from the workspace. Owner/admin only; the last owner can't be removed. Write tool, destructive.",
        inputSchema: {
          type: 'object',
          required: ['userId'],
          properties: { userId: { type: 'string' } },
        },
      },
      // ---- AI (PBI-128) -----------------------------------------------------
      {
        name: 'synapse_ai_ask',
        description:
          'Ask Claude a free-form prompt (returns text + a stub flag when no API key is configured). Write tool (may incur AI cost).',
        inputSchema: {
          type: 'object',
          required: ['prompt'],
          properties: { prompt: { type: 'string' } },
        },
      },
      {
        name: 'synapse_ai_transform',
        description:
          'Transform text with Claude: write / summarize / translate / rewrite. Write tool (may incur AI cost).',
        inputSchema: {
          type: 'object',
          required: ['mode'],
          properties: {
            mode: { type: 'string', enum: ['write', 'summarize', 'translate', 'rewrite'] },
            text: { type: 'string' },
            instruction: { type: 'string' },
            targetLang: { type: 'string' },
          },
        },
      },
      {
        name: 'synapse_ai_summarize_page',
        description:
          "Generate a page's AI summary and store it on the page (props.aiSummary). Write tool (may incur AI cost).",
        inputSchema: {
          type: 'object',
          required: ['pageId'],
          properties: { pageId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_ai_synthesize_pbi',
        description:
          'Synthesize a PBI + N SBIs from a free-text information source, optionally under a project/sprint. Creates the PBI/SBIs. Write tool (may incur AI cost).',
        inputSchema: {
          type: 'object',
          required: ['informationSource'],
          properties: {
            informationSource: { type: 'string' },
            projectId: { type: 'string' },
            sprintId: { type: 'string' },
          },
        },
      },
      {
        name: 'synapse_ai_summarize_sprint',
        description:
          'Walk a sprint (PBIs + SBI rollup) and produce a completion report with an executive summary. Write tool (may incur AI cost).',
        inputSchema: {
          type: 'object',
          required: ['sprintId'],
          properties: { sprintId: { type: 'string' } },
        },
      },
      // ---- cc: headless Claude Code sessions (PBI-129) ----------------------
      {
        name: 'synapse_start_cc_for_pbi',
        description:
          'Start a headless Claude Code session to implement a PBI (dev: a stub session). Consumes workspace budget. Write tool, destructive.',
        inputSchema: {
          type: 'object',
          required: ['pbiId'],
          properties: { pbiId: { type: 'string' } },
        },
      },
      {
        name: 'synapse_list_cc_sessions',
        description: 'List the cc (headless Claude Code) sessions in the workspace. Read-only.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'synapse_get_cc_for_pbi',
        description: 'Get the latest cc session for a PBI (or null). Read-only.',
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
    case 'synapse_upload_image':
      return uploadImage(ctx, uploadImageSchema.parse(args));
    case 'synapse_insert_image':
      return insertImage(ctx, insertImageSchema.parse(args));
    // ---- GitHub Issue linking (PBI-122) -------------------------------------
    case 'synapse_link_github_issue':
      return linkGithubIssue(ctx, linkGithubIssueSchema.parse(args));
    case 'synapse_unlink_github_issue':
      return unlinkGithubIssue(ctx, unlinkGithubIssueSchema.parse(args));
    // ---- favorites & bookmarks (PBI-126) ------------------------------------
    case 'synapse_toggle_favorite':
      return toggleFavorite(ctx, toggleFavoriteSchema.parse(args));
    case 'synapse_list_favorites':
      return listFavorites(ctx, listFavoritesSchema.parse(args));
    case 'synapse_is_favorite':
      return isFavorite(ctx, isFavoriteSchema.parse(args));
    case 'synapse_fetch_bookmark':
      return fetchBookmark(ctx, fetchBookmarkSchema.parse(args));
    // ---- user-defined DB / spreadsheet (PBI-121) ----------------------------
    case 'synapse_create_db':
      return createDb(ctx, createDbSchema.parse(args));
    case 'synapse_get_db':
      return getDb(ctx, getDbSchema.parse(args));
    case 'synapse_list_dbs':
      return listDbs(ctx, listDbsSchema.parse(args));
    case 'synapse_db_add_column':
      return dbAddColumn(ctx, dbAddColumnSchema.parse(args));
    case 'synapse_db_update_column':
      return dbUpdateColumn(ctx, dbUpdateColumnSchema.parse(args));
    case 'synapse_db_delete_column':
      return dbDeleteColumn(ctx, dbDeleteColumnSchema.parse(args));
    case 'synapse_db_add_row':
      return dbAddRow(ctx, dbAddRowSchema.parse(args));
    case 'synapse_db_update_cell':
      return dbUpdateCell(ctx, dbUpdateCellSchema.parse(args));
    case 'synapse_db_reorder_rows':
      return dbReorderRows(ctx, dbReorderRowsSchema.parse(args));
    case 'synapse_db_delete_row':
      return dbDeleteRow(ctx, dbDeleteRowSchema.parse(args));
    // ---- chat (PBI-123) -----------------------------------------------------
    case 'synapse_list_channels':
      return listChannels(ctx, listChannelsSchema.parse(args));
    case 'synapse_create_channel':
      return createChannel(ctx, createChannelSchema.parse(args));
    case 'synapse_list_messages':
      return listMessages(ctx, listMessagesSchema.parse(args));
    case 'synapse_send_message':
      return sendMessage(ctx, sendMessageSchema.parse(args));
    case 'synapse_delete_message':
      return deleteMessage(ctx, deleteMessageSchema.parse(args));
    case 'synapse_react_message':
      return reactMessage(ctx, reactMessageSchema.parse(args));
    // ---- notifications & reminders (PBI-124) --------------------------------
    case 'synapse_list_notifications':
      return listNotifications(ctx, listNotificationsSchema.parse(args));
    case 'synapse_unread_count':
      return unreadCount(ctx, unreadCountSchema.parse(args));
    case 'synapse_mark_notification_read':
      return markNotificationRead(ctx, markNotificationReadSchema.parse(args));
    case 'synapse_mark_all_notifications_read':
      return markAllNotificationsRead(ctx, markAllNotificationsReadSchema.parse(args));
    case 'synapse_create_reminder':
      return createReminder(ctx, createReminderSchema.parse(args));
    case 'synapse_snooze_reminder':
      return snoozeReminder(ctx, snoozeReminderSchema.parse(args));
    case 'synapse_list_reminders':
      return listReminders(ctx, listRemindersSchema.parse(args));
    case 'synapse_delete_reminder':
      return deleteReminder(ctx, deleteReminderSchema.parse(args));
    // ---- workspace member management (PBI-125) ------------------------------
    case 'synapse_list_members':
      return listMembers(ctx, listMembersSchema.parse(args));
    case 'synapse_list_invitations':
      return listInvitations(ctx, listInvitationsSchema.parse(args));
    case 'synapse_invite_member':
      return inviteMember(ctx, inviteMemberSchema.parse(args));
    case 'synapse_cancel_invitation':
      return cancelInvitation(ctx, cancelInvitationSchema.parse(args));
    case 'synapse_set_member_role':
      return setMemberRole(ctx, setMemberRoleSchema.parse(args));
    case 'synapse_remove_member':
      return removeMember(ctx, removeMemberSchema.parse(args));
    // ---- AI (PBI-128) -------------------------------------------------------
    case 'synapse_ai_ask':
      return aiAsk(ctx, aiAskSchema.parse(args));
    case 'synapse_ai_transform':
      return aiTransform(ctx, aiTransformSchema.parse(args));
    case 'synapse_ai_summarize_page':
      return aiSummarizePage(ctx, aiSummarizePageSchema.parse(args));
    case 'synapse_ai_synthesize_pbi':
      return aiSynthesizePbi(ctx, aiSynthesizePbiSchema.parse(args));
    case 'synapse_ai_summarize_sprint':
      return aiSummarizeSprint(ctx, aiSummarizeSprintSchema.parse(args));
    // ---- cc: headless Claude Code sessions (PBI-129) ------------------------
    case 'synapse_start_cc_for_pbi':
      return startCcForPbi(ctx, startCcForPbiSchema.parse(args));
    case 'synapse_list_cc_sessions':
      return listCcSessions(ctx, listCcSessionsSchema.parse(args));
    case 'synapse_get_cc_for_pbi':
      return getCcForPbi(ctx, getCcForPbiSchema.parse(args));
    default:
      throw new ToolError('INVALID', `Unknown tool: ${name}`);
  }
}

main().catch((err) => {
  console.error(`[${SERVICE_NAME}] fatal:`, err);
  process.exit(1);
});
