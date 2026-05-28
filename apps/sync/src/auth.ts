/**
 * WebSocket authentication for Hocuspocus.
 *
 * Browser-side flow:
 *   1. The web client reads `session.session.token` from Better-Auth.
 *   2. The HocuspocusProvider passes it as `token: '<value>'`.
 *   3. Hocuspocus forwards it to `onAuthenticate({ token, documentName })`.
 *
 * Server-side we resolve token → session → user → workspace-membership
 * check against the document name. Rejecting the connection from inside
 * `onAuthenticate` is the only safe place — once a websocket is
 * upgraded, every byte that flows is authenticated.
 *
 * Two document name prefixes are accepted:
 *   - `page:<blockId>`    legacy /p/$pageId route; backing block must be
 *                         type='page'
 *   - `block:<blockId>`   /b/$blockId detail route; backing block can be
 *                         any non-deleted type (project / sprint / pbi /
 *                         sbi / page / sheet). Project / Sprint / PBI /
 *                         SBI gain a Notion-style "the item *is* the
 *                         document" body this way.
 */
import { and, eq } from 'drizzle-orm';

import type { Database } from './db.js';
import { schema } from './db.js';

export type AuthedConnection = {
  userId: string;
  workspaceId: string;
  blockId: string;
  kind: 'page' | 'block';
};

/** Document name → `{kind, blockId}`. Throws on unsupported namespaces. */
export function parseDocumentName(documentName: string): {
  kind: 'page' | 'block';
  blockId: string;
} {
  const [kind, rest] = documentName.split(':');
  if ((kind === 'page' || kind === 'block') && rest) {
    return { kind, blockId: rest };
  }
  throw new Error(`Unsupported document name: ${documentName}`);
}

export async function authenticateConnection(
  db: Database,
  token: string,
  documentName: string,
): Promise<AuthedConnection> {
  const { kind, blockId } = parseDocumentName(documentName);

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
  // `page:` legacy prefix is reserved for actual page rows; the generic
  // `block:` prefix is allowed for any other block type.
  if (kind === 'page' && blockRow.type !== 'page') {
    throw new Error('Block is not a page');
  }

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
    kind,
  };
}
