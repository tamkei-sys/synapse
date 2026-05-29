/**
 * MCP integration tables.
 *
 * `api_token` — workspace-scoped bearer tokens used by the SYNAPSE MCP
 *               server (and any future programmatic clients). The
 *               plaintext is never persisted; only a SHA-256 hash. The
 *               full token is shown to the user exactly once at
 *               creation time (CLAUDE.md §6 "short-lived, rotatable").
 *
 * `audit_log` — append-only record of every MCP tool invocation, so
 *               workspace owners can answer "what did the agent touch?"
 *               This is the half of the trust model that lets us hand
 *               write tools to an agent (CLAUDE.md §6 "every tool
 *               invocation produces an audit log").
 */
import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { user } from './auth.js';
import { workspace } from './workspace.js';

/** トークンに付与可能なスコープ enum。 */
export const TOKEN_SCOPES = ['read', 'write_pbi', 'write_comment', 'admin'] as const;
export type TokenScope = (typeof TOKEN_SCOPES)[number];

export const apiToken = pgTable(
  'api_token',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** SHA-256 hex digest of the plaintext token. */
    tokenHash: text('token_hash').notNull(),
    /** Last 8 chars of the plaintext token — safe to display in lists. */
    suffix: text('suffix').notNull(),
    /** Human label shown in the settings UI. */
    label: text('label').notNull(),
    /** どの種類の操作を許可するか。空 = 何もできない、['admin'] = 全権。 */
    scopes: text('scopes')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  },
  (t) => ({
    hashUidx: uniqueIndex('api_token_hash_uidx').on(t.tokenHash),
    workspaceIdx: index('api_token_workspace_idx').on(t.workspaceId),
  }),
);

export type ApiTokenRow = typeof apiToken.$inferSelect;
export type NewApiTokenRow = typeof apiToken.$inferInsert;

export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    actorUserId: text('actor_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** Nullable: tool calls from web UI sessions have no token. */
    actorTokenId: text('actor_token_id').references(() => apiToken.id, { onDelete: 'set null' }),
    tool: text('tool').notNull(),
    args: jsonb('args'),
    result: text('result').notNull(), // 'ok' | 'error'
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('audit_log_workspace_idx').on(t.workspaceId, t.createdAt),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
