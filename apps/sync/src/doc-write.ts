/**
 * Server-side document body writes for trusted internal callers (the MCP
 * server's synapse_append_doc / synapse_set_doc tools). See ADR-0011.
 *
 * The body is a live Yjs document, so we mutate it through Hocuspocus
 * `openDirectConnection` — connected editors see the change in real time and
 * the existing `store` hook persists it (props.doc snapshot, version,
 * backlinks). We never write `block_yjs_state` directly.
 *
 * Content arrives as ProseMirror/TipTap JSON (the editor's doc shape) and is
 * built into the `'default'` XmlFragment with the same node/mark encoding
 * y-prosemirror uses — generalising the manual append proven in the Phase-0
 * spike.
 */
import type { Hocuspocus } from '@hocuspocus/server';
import { and, eq } from 'drizzle-orm';
import * as Y from 'yjs';

import { schema, type Database } from './db.js';

export type DocWriteMode = 'append' | 'replace';

export type PmMark = { type: string; attrs?: Record<string, unknown> };
export type PmNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: PmMark[];
  content?: PmNode[];
};
export type PmDoc = { type: 'doc'; content?: PmNode[] };

export class DocWriteError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DocWriteError';
  }
}

function marksToFormat(marks: PmMark[] | undefined): Record<string, unknown> {
  const fmt: Record<string, unknown> = {};
  for (const m of marks ?? []) fmt[m.type] = m.attrs ?? {};
  return fmt;
}

/** Build a y-prosemirror node (XmlElement / XmlText) from ProseMirror JSON. */
function pmNodeToY(node: PmNode): Y.XmlElement | Y.XmlText {
  if (node.type === 'text') {
    const text = new Y.XmlText();
    const fmt = marksToFormat(node.marks);
    text.insert(0, node.text ?? '', Object.keys(fmt).length > 0 ? fmt : undefined);
    return text;
  }
  const el = new Y.XmlElement(node.type);
  for (const [key, value] of Object.entries(node.attrs ?? {})) {
    if (value == null) continue;
    el.setAttribute(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  const children = (node.content ?? []).map(pmNodeToY);
  if (children.length > 0) el.insert(0, children);
  return el;
}

/** The block must be a page and the actor a non-viewer member of its workspace. */
async function assertActorCanWritePage(
  db: Database,
  blockId: string,
  actorUserId: string,
): Promise<void> {
  const [block] = await db
    .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
    .from(schema.block)
    .where(eq(schema.block.id, blockId))
    .limit(1);
  if (!block || block.type !== 'page') throw new DocWriteError(404, 'page not found');

  const [member] = await db
    .select({ role: schema.workspaceMember.role })
    .from(schema.workspaceMember)
    .where(
      and(
        eq(schema.workspaceMember.workspaceId, block.workspaceId),
        eq(schema.workspaceMember.userId, actorUserId),
      ),
    )
    .limit(1);
  if (!member) throw new DocWriteError(403, 'actor is not a member of this workspace');
  if (member.role === 'viewer') throw new DocWriteError(403, 'viewers cannot write');
}

export type DocWriteRequest = {
  blockId: string;
  actorUserId: string;
  doc: PmDoc;
  mode: DocWriteMode;
};

/**
 * Append to (or replace) a page body through a server-side direct connection.
 * Resolves once the edit is committed to the in-memory CRDT; the store hook
 * then persists + broadcasts it.
 */
export async function applyDocWrite(
  server: Hocuspocus,
  db: Database,
  req: DocWriteRequest,
): Promise<{ ok: true; nodes: number }> {
  await assertActorCanWritePage(db, req.blockId, req.actorUserId);

  const nodes = req.doc.content ?? [];
  const connection = await server.openDirectConnection('page:' + req.blockId);
  try {
    await connection.transact((document) => {
      const fragment = document.getXmlFragment('default');
      if (req.mode === 'replace') fragment.delete(0, fragment.length);
      fragment.insert(fragment.length, nodes.map(pmNodeToY));
    });
  } finally {
    await connection.disconnect();
  }
  return { ok: true, nodes: nodes.length };
}
