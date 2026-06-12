import { describe, expect, it } from 'vitest';

import { DEFAULT_MANUAL, type ManualPageDef } from './default-manual-content.js';

// Node/mark types the sync seeder (apps/sync template-schema) can encode.
// The manual MUST stay within this set or pages open empty on first view.
// Keep in sync with apps/api/scripts/generate-default-manual.mjs.
const ALLOWED_NODES = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
  'blockquote',
  'codeBlock',
  'hardBreak',
  'horizontalRule',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
]);
const ALLOWED_MARKS = new Set(['bold', 'italic', 'strike', 'code']);

function flatten(def: ManualPageDef): ManualPageDef[] {
  return [def, ...(def.children ?? []).flatMap(flatten)];
}

function collect(node: unknown, nodes: Set<string>, marks: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: string; marks?: { type: string }[]; content?: unknown[] };
  if (n.type) nodes.add(n.type);
  for (const m of n.marks ?? []) marks.add(m.type);
  for (const c of n.content ?? []) collect(c, nodes, marks);
}

describe('default manual', () => {
  const pages = flatten(DEFAULT_MANUAL);

  it('ships the full 10-page tree under one hub', () => {
    expect(pages.length).toBe(10);
    expect(DEFAULT_MANUAL.key).toBe('hub');
    expect((DEFAULT_MANUAL.children ?? []).length).toBe(9);
  });

  it('has unique keys and non-empty titles/icons/docs', () => {
    const keys = pages.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const p of pages) {
      expect(p.title.length).toBeGreaterThan(0);
      expect(p.icon.length).toBeGreaterThan(0);
      expect(p.doc.type).toBe('doc');
      expect(Array.isArray(p.doc.content) && p.doc.content.length > 0).toBe(true);
    }
  });

  it('uses only nodes/marks the sync seeder can encode', () => {
    for (const p of pages) {
      const nodes = new Set<string>();
      const marks = new Set<string>();
      collect(p.doc, nodes, marks);
      for (const ty of nodes) {
        expect(ALLOWED_NODES.has(ty), `${p.key} uses unsupported node "${ty}"`).toBe(true);
      }
      for (const ty of marks) {
        expect(ALLOWED_MARKS.has(ty), `${p.key} uses unsupported mark "${ty}"`).toBe(true);
      }
    }
  });
});
