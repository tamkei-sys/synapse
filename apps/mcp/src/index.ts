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
  createPbi,
  createPbiSchema,
  getPbi,
  getPbiSchema,
  listPbis,
  listPbisSchema,
  ToolError,
  updatePbiStatus,
  updatePbiStatusSchema,
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
            storyPoints: { type: 'integer', minimum: 0, maximum: 100 },
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
    default:
      throw new ToolError('INVALID', `Unknown tool: ${name}`);
  }
}

main().catch((err) => {
  console.error(`[${SERVICE_NAME}] fatal:`, err);
  process.exit(1);
});
