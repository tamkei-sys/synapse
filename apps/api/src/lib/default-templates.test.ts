import { describe, expect, it } from 'vitest';

import { DEFAULT_TEMPLATES } from './default-templates.js';

// Node types the sync seeder (apps/sync template-schema) can encode. Templates
// MUST stay within this set or their body won't hydrate on first open.
const ALLOWED = new Set([
  'doc',
  'paragraph',
  'text',
  'heading',
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

function collectTypes(node: unknown, into: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const n = node as { type?: string; content?: unknown[] };
  if (n.type) into.add(n.type);
  if (Array.isArray(n.content)) for (const c of n.content) collectTypes(c, into);
}

describe('default templates (PBI-105)', () => {
  it('ships a non-empty curated set', () => {
    expect(DEFAULT_TEMPLATES.length).toBeGreaterThanOrEqual(8);
  });

  it('has unique keys and titles', () => {
    const keys = DEFAULT_TEMPLATES.map((t) => t.key);
    const titles = DEFAULT_TEMPLATES.map((t) => t.title);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('every template has an icon and a non-empty doc', () => {
    for (const t of DEFAULT_TEMPLATES) {
      expect(t.icon.length).toBeGreaterThan(0);
      expect(t.doc.type).toBe('doc');
      expect(Array.isArray(t.doc.content) && t.doc.content.length > 0).toBe(true);
    }
  });

  it('uses only nodes the sync seeder can encode', () => {
    for (const t of DEFAULT_TEMPLATES) {
      const types = new Set<string>();
      collectTypes(t.doc, types);
      for (const ty of types) {
        expect(ALLOWED.has(ty), `${t.key} uses unsupported node "${ty}"`).toBe(true);
      }
    }
  });
});
