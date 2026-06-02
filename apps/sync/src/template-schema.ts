/**
 * Server-side ProseMirror schema + Yjs seeding (PBI-105).
 *
 * When a page has a `props.doc` snapshot but no stored Yjs state yet
 * (a built-in template, or a page freshly created from one), Hocuspocus
 * has nothing to load. We build an initial Yjs document from the snapshot
 * so the editor opens with the templated content — the first edit then
 * persists real CRDT state through the normal `store` path.
 *
 * The schema mirrors the standard TipTap nodes used for structured docs
 * (headings, lists, task lists, tables, blockquotes). Templates are
 * authored with only these nodes; richer custom nodes (callout, toggle,
 * embeds, math) intentionally aren't seeded here — those pages always
 * acquire Yjs state through normal editing, so this path never runs for
 * them (their snapshot is only ever written *after* real state exists).
 */
import { getSchema } from '@tiptap/core';
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import StarterKit from '@tiptap/starter-kit';
import { prosemirrorJSONToYDoc } from 'y-prosemirror';
import * as Y from 'yjs';

// Built once. Node names match the web editor (StarterKit + task list +
// table), so a fragment encoded here loads cleanly in the client schema.
const schema = getSchema([
  StarterKit,
  TaskList,
  TaskItem.configure({ nested: true }),
  Table,
  TableRow,
  TableHeader,
  TableCell,
]);

type DocSnapshot = { type?: string; content?: unknown[] } | null | undefined;

/** True when the snapshot has real content (more than a lone empty paragraph). */
function hasRealContent(doc: DocSnapshot): boolean {
  if (!doc || doc.type !== 'doc' || !Array.isArray(doc.content) || doc.content.length === 0) {
    return false;
  }
  if (doc.content.length === 1) {
    const only = doc.content[0] as { type?: string; content?: unknown[] };
    if (only?.type === 'paragraph' && (!only.content || only.content.length === 0)) return false;
  }
  return true;
}

/**
 * Encode a TipTap/ProseMirror JSON snapshot into an initial Yjs update,
 * or return null when there's nothing meaningful to seed (so the caller
 * keeps the previous empty-document behaviour).
 */
export function seedStateFromDoc(doc: unknown): Uint8Array | null {
  const snapshot = (doc ?? null) as DocSnapshot;
  if (!hasRealContent(snapshot)) return null;
  try {
    const ydoc = prosemirrorJSONToYDoc(schema, snapshot, 'default');
    return Y.encodeStateAsUpdate(ydoc);
  } catch {
    // Snapshot referenced a node outside the seed schema — leave the
    // document empty rather than crash the load.
    return null;
  }
}
