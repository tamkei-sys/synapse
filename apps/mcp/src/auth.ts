/**
 * Resolve a plaintext API token to a workspace + user.
 *
 * Returns null when the token is unknown, revoked, or expired. The hash
 * comparison is uniqueness-indexed in Postgres (`api_token_hash_uidx`)
 * so the lookup is O(1) and constant-ish-time at the DB layer.
 *
 * On successful match we bump `last_used_at` fire-and-forget so the
 * settings UI can show recently-used tokens — failures of that update
 * are non-fatal.
 */
import { and, eq, gt, isNull, or, sql } from 'drizzle-orm';

import { type Database, schema } from './db.js';

const encoder = new TextEncoder();

export type ResolvedToken = {
  tokenId: string;
  workspaceId: string;
  userId: string;
};

export async function resolveApiToken(
  db: Database,
  plaintext: string,
): Promise<ResolvedToken | null> {
  const hashHex = await sha256Hex(plaintext);
  const [row] = await db
    .select({
      id: schema.apiToken.id,
      workspaceId: schema.apiToken.workspaceId,
      userId: schema.apiToken.userId,
    })
    .from(schema.apiToken)
    .where(
      and(
        eq(schema.apiToken.tokenHash, hashHex),
        isNull(schema.apiToken.revokedAt),
        or(isNull(schema.apiToken.expiresAt), gt(schema.apiToken.expiresAt, new Date())),
      ),
    )
    .limit(1);

  if (!row) return null;

  // Best-effort timestamp; failures don't compromise auth.
  void db
    .update(schema.apiToken)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiToken.id, row.id))
    .execute()
    .catch(() => undefined);

  return { tokenId: row.id, workspaceId: row.workspaceId, userId: row.userId };
}

async function sha256Hex(plaintext: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', encoder.encode(plaintext));
  return hex(new Uint8Array(buf));
}

function hex(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}

// `sql` import keeps eslint happy when this file is consumed by tests
// that mock the query builder. No-op at runtime.
const _keepSql = sql;
void _keepSql;
