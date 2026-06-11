/**
 * Server-side document body writes for trusted internal callers (the MCP
 * server's synapse_append_doc / synapse_set_doc tools). See ADR-0011.
 *
 * The target is any block whose detail view is a document body: pages, and —
 * since the 2026-06-11 amendment — projects / sprints / PBIs / SBIs (the
 * "the item *is* the document" body the /b/$blockId route edits).
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
    // Preserve native types (numbers / booleans) so e.g. a heading's `level`
    // round-trips as a number. y-prosemirror reads attributes back as-is, and
    // TipTap's heading falls back to level 1 when `level` is a string — which
    // silently flattened every h2/h3 to h1. Only objects/arrays need encoding.
    el.setAttribute(key, (typeof value === 'object' ? JSON.stringify(value) : value) as string);
  }
  const children = (node.content ?? []).map(pmNodeToY);
  if (children.length > 0) el.insert(0, children);
  return el;
}

/**
 * Block types whose detail view is a TipTap document body. Matches the web
 * routes: `/p/$pageId` (page) and `/b/$blockId` (project / sprint / pbi /
 * sbi). Other types (sheet cells, db rows, …) own their Yjs docs differently
 * — writing a prosemirror fragment into them would corrupt their model.
 */
const BODY_BLOCK_TYPES = new Set(['page', 'project', 'sprint', 'pbi', 'sbi']);

/**
 * The block must carry a document body. When `actorUserId` is given (the MCP
 * path), that user must be a non-viewer member of the block's workspace. When
 * omitted, the caller is trusted infrastructure already proven by the shared
 * secret (a system write), so only the block check applies.
 *
 * Returns the block type — the caller derives the Yjs document name from it.
 */
async function assertWritableBlock(
  db: Database,
  blockId: string,
  actorUserId: string | undefined,
): Promise<string> {
  const [block] = await db
    .select({ workspaceId: schema.block.workspaceId, type: schema.block.type })
    .from(schema.block)
    .where(eq(schema.block.id, blockId))
    .limit(1);
  if (!block) throw new DocWriteError(404, 'block not found');
  if (!BODY_BLOCK_TYPES.has(block.type)) {
    throw new DocWriteError(400, `block type '${block.type}' has no document body`);
  }
  if (!actorUserId) return block.type;

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
  return block.type;
}

export type DocWriteRequest = {
  blockId: string;
  /** Acting user; when set, enforced as a non-viewer member. Omit for system writes. */
  actorUserId?: string;
  doc: PmDoc;
  mode: DocWriteMode;
};

/**
 * Append to (or replace) a document body through a server-side direct
 * connection. Resolves once the edit is committed to the in-memory CRDT; the
 * store hook then persists + broadcasts it.
 */
export async function applyDocWrite(
  server: Hocuspocus,
  db: Database,
  req: DocWriteRequest,
): Promise<{ ok: true; nodes: number }> {
  const blockType = await assertWritableBlock(db, req.blockId, req.actorUserId);

  const nodes = req.doc.content ?? [];
  // The document name must match what live editors connect with — `/p/$pageId`
  // opens `page:<id>`, `/b/$blockId` opens `block:<id>` — so the write lands
  // in the in-memory document Hocuspocus is already serving to them.
  const docName = (blockType === 'page' ? 'page:' : 'block:') + req.blockId;
  const connection = await server.openDirectConnection(docName);
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
