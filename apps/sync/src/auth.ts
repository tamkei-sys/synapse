/**
 * WebSocket authentication for Hocuspocus.
 *
 * Browser-side flow:
 *   1. The web client reads `session.session.token` from Better-Auth.
 *   2. The HocuspocusProvider passes it as `token: '<value>'`.
 *   3. Hocuspocus forwards it to `onAuthenticate({ token, documentName })`.
 *
 * Server-side we resolve token → session → user → workspace-membership
 * check against the `page:<blockId>` document name. Rejecting the
 * connection from inside `onAuthenticate` is the only safe place — once
 * a websocket is upgraded, every byte that flows is authenticated.
 */
import { and, eq } from 'drizzle-orm';

import type { Database } from './db.js';
import { schema } from './db.js';

export type AuthedConnection = {
  userId: string;
  workspaceId: string;
  blockId: string;
};

/** Document names follow `page:<blockId>` — keeps namespacing extensible. */
export function parseDocumentName(documentName: string): { kind: 'page'; blockId: string } {
  const [kind, rest] = documentName.split(':');
  if (kind !== 'page' || !rest) {
    throw new Error(`Unsupported document name: ${documentName}`);
  }
  return { kind: 'page', blockId: rest };
}

export async function authenticateConnection(
  db: Database,
  token: string,
  documentName: string,
): Promise<AuthedConnection> {
  const { blockId } = parseDocumentName(documentName);

  const [sessionRow] = await db
    .select({ userId: schema.session.userId, expiresAt: schema.session.expiresAt })
    .from(schema.session)
    .where(eq(schema.session.token, token))
    .limit(1);

  if (!sessionRow) throw new Error('Invalid session token');
  if (sessionRow.expiresAt.getTime() < Date.now()) throw new Error('Session expired');

  const [blockRow] = await db
    .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
    .from(schema.block)
    .where(eq(schema.block.id, blockId))
    .limit(1);

  if (!blockRow) throw new Error('Block not found');
  if (blockRow.type !== 'page') throw new Error('Block is not a page');

  const [membership] = await db
    .select({ role: schema.workspaceMember.role })
    .from(schema.workspaceMember)
    .where(
      and(
        eq(schema.workspaceMember.workspaceId, blockRow.workspaceId),
        eq(schema.workspaceMember.userId, sessionRow.userId),
      ),
    )
    .limit(1);

  if (!membership) throw new Error('Not a member of this workspace');

  return {
    userId: sessionRow.userId,
    workspaceId: blockRow.workspaceId,
    blockId,
  };
}
