/**
 * Audit logging.
 *
 * Every MCP tool invocation passes through `record()`. The row is
 * insertable even on failure (`result: 'error'`) so workspace owners
 * can see what was attempted, not just what succeeded.
 *
 * `args` is the raw input JSON capped to a sensible size — we don't
 * trust callers to send small payloads.
 */
import { ulid } from 'ulid';

import { type Database, schema } from './db.js';

const MAX_ARGS_BYTES = 4_000;

export type AuditContext = {
  db: Database;
  workspaceId: string;
  userId: string;
  tokenId: string;
};

export type AuditRecord = {
  tool: string;
  args: unknown;
  result: 'ok' | 'error';
  errorMessage?: string;
};

export async function record(ctx: AuditContext, entry: AuditRecord): Promise<void> {
  await ctx.db
    .insert(schema.auditLog)
    .values({
      id: ulid(),
      workspaceId: ctx.workspaceId,
      actorUserId: ctx.userId,
      actorTokenId: ctx.tokenId,
      tool: entry.tool,
      args: clampArgs(entry.args),
      result: entry.result,
      errorMessage: entry.errorMessage ?? null,
    })
    .execute();
}

function clampArgs(args: unknown): unknown {
  try {
    const json = JSON.stringify(args);
    if (json.length <= MAX_ARGS_BYTES) return args;
    return { truncated: true, preview: json.slice(0, MAX_ARGS_BYTES) };
  } catch {
    return { unserializable: true };
  }
}
