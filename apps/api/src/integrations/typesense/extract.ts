/**
 * Project a Block row to a Typesense document.
 *
 * Each block type has its own title/body extraction:
 *   - page   title from props.title, body = flattened TipTap doc text
 *   - pbi    title from props.title, body = "" (S8 surface)
 *   - sheet  title = `Sheet <last-6>`, body = concatenated cell values
 *
 * We deliberately store at most ~8KB of body per doc — bigger pages
 * still index but with truncation. Typesense's relevance-by-text-match
 * stays useful well past that point.
 */
import type { SearchHit } from './client.js';

const MAX_BODY = 8_192;

type ProjectInput = {
  id: string;
  workspaceId: string;
  type: string;
  props: unknown;
  updatedAt: Date;
};

export function projectBlock(row: ProjectInput): SearchHit | null {
  const props = (row.props ?? {}) as Record<string, unknown>;
  switch (row.type) {
    case 'page': {
      const title = stringOr(props['title'], 'Untitled');
      const body = flattenDoc(props['doc']).slice(0, MAX_BODY);
      return base(row, title, body);
    }
    case 'pbi': {
      const title = stringOr(props['title'], 'Untitled PBI');
      return base(row, title);
    }
    case 'sheet': {
      const title = `Sheet ${row.id.slice(-6)}`;
      const cells = (props['cells'] as Record<string, string> | undefined) ?? {};
      const body = Object.values(cells).join(' ').slice(0, MAX_BODY);
      return base(row, title, body);
    }
    default:
      return null;
  }
}

function base(row: ProjectInput, title: string, body?: string): SearchHit {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    type: row.type as SearchHit['type'],
    title,
    ...(body ? { body } : {}),
    updatedAt: Math.floor(row.updatedAt.getTime() / 1000),
  };
}

function stringOr(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/**
 * Walk a TipTap / ProseMirror JSON document and concatenate every `text`
 * node it finds. We don't care about structure for search — a flat
 * stream is the best fit for `query_by: title,body`.
 */
function flattenDoc(doc: unknown): string {
  if (!doc || typeof doc !== 'object') return '';
  const out: string[] = [];
  walk(doc, out);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function walk(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return;
  const n = node as Record<string, unknown>;
  if (typeof n['text'] === 'string') out.push(n['text']);
  const content = n['content'];
  if (Array.isArray(content)) {
    for (const child of content) walk(child, out);
  }
}
