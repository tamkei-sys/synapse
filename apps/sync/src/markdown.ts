/**
 * Markdown → ProseMirror/TipTap JSON, DOM-free (ADR-0011, revised).
 *
 * The original ADR proposed marked → HTML → `@tiptap/html` generateJSON, but
 * generateJSON needs a DOM, which the Node sync process doesn't have. Instead
 * we walk marked's token tree and map directly onto the editor's node/mark
 * names (StarterKit + task list + table). The resulting JSON feeds the same
 * `applyDocWrite` path; `pmNodeToY` encodes it into the Yjs 'default' fragment.
 *
 * Supported: headings, paragraphs, bullet/ordered/task lists (nested), code
 * blocks, blockquotes, horizontal rules, and inline bold/italic/strike/code/
 * link/hard-break. Unsupported block types (e.g. tables, raw HTML) fall back to
 * a plain paragraph of their source text rather than failing.
 */
import { marked, type Token, type Tokens } from 'marked';

import type { PmDoc, PmMark, PmNode } from './doc-write.js';

function inlineToPm(tokens: Token[] | undefined, marks: PmMark[]): PmNode[] {
  const out: PmNode[] = [];
  const pushText = (text: string, withMarks: PmMark[]): void => {
    if (text.length === 0) return; // ProseMirror forbids empty text nodes
    out.push({ type: 'text', text, ...(withMarks.length > 0 ? { marks: withMarks } : {}) });
  };
  for (const tok of tokens ?? []) {
    switch (tok.type) {
      case 'text':
      case 'escape':
      case 'html':
        pushText((tok as Tokens.Text).text, marks);
        break;
      case 'strong':
        out.push(...inlineToPm((tok as Tokens.Strong).tokens, [...marks, { type: 'bold' }]));
        break;
      case 'em':
        out.push(...inlineToPm((tok as Tokens.Em).tokens, [...marks, { type: 'italic' }]));
        break;
      case 'del':
        out.push(...inlineToPm((tok as Tokens.Del).tokens, [...marks, { type: 'strike' }]));
        break;
      case 'codespan':
        pushText((tok as Tokens.Codespan).text, [...marks, { type: 'code' }]);
        break;
      case 'link': {
        const link = tok as Tokens.Link;
        out.push(...inlineToPm(link.tokens, [...marks, { type: 'link', attrs: { href: link.href } }]));
        break;
      }
      case 'br':
        out.push({ type: 'hardBreak' });
        break;
      default: {
        const text = (tok as { text?: unknown }).text;
        if (typeof text === 'string') pushText(text, marks);
      }
    }
  }
  return out;
}

function listToPm(list: Tokens.List): PmNode {
  const isTask = list.items.some((it) => it.task);
  const items: PmNode[] = list.items.map((it) => {
    const content = blocksToPm(it.tokens);
    const safe = content.length > 0 ? content : [{ type: 'paragraph', content: [] }];
    if (isTask) {
      return { type: 'taskItem', attrs: { checked: Boolean(it.checked) }, content: safe };
    }
    return { type: 'listItem', content: safe };
  });
  if (isTask) return { type: 'taskList', content: items };
  if (list.ordered) {
    const start = typeof list.start === 'number' ? list.start : 1;
    return {
      type: 'orderedList',
      ...(start !== 1 ? { attrs: { start } } : {}),
      content: items,
    };
  }
  return { type: 'bulletList', content: items };
}

function blockToPm(token: Token): PmNode | null {
  switch (token.type) {
    case 'space':
    case 'def':
      return null;
    case 'heading': {
      const h = token as Tokens.Heading;
      return { type: 'heading', attrs: { level: h.depth }, content: inlineToPm(h.tokens, []) };
    }
    case 'paragraph': {
      const p = token as Tokens.Paragraph;
      return { type: 'paragraph', content: inlineToPm(p.tokens, []) };
    }
    case 'text': {
      const t = token as Tokens.Text;
      return {
        type: 'paragraph',
        content: t.tokens ? inlineToPm(t.tokens, []) : inlineToPm([t], []),
      };
    }
    case 'code': {
      const c = token as Tokens.Code;
      return {
        type: 'codeBlock',
        ...(c.lang ? { attrs: { language: c.lang } } : {}),
        content: c.text.length > 0 ? [{ type: 'text', text: c.text }] : [],
      };
    }
    case 'blockquote': {
      const b = token as Tokens.Blockquote;
      const inner = blocksToPm(b.tokens);
      return { type: 'blockquote', content: inner.length > 0 ? inner : [{ type: 'paragraph', content: [] }] };
    }
    case 'hr':
      return { type: 'horizontalRule' };
    case 'list':
      return listToPm(token as Tokens.List);
    default: {
      // Unsupported block (table, html, …) → keep the source text as a paragraph.
      const raw = (token as { raw?: unknown }).raw;
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return { type: 'paragraph', content: [{ type: 'text', text: raw.trim() }] };
      }
      return null;
    }
  }
}

function blocksToPm(tokens: Token[]): PmNode[] {
  const out: PmNode[] = [];
  for (const token of tokens) {
    const node = blockToPm(token);
    if (node) out.push(node);
  }
  return out;
}

/** Convert a markdown string into a ProseMirror doc matching the editor schema. */
export function markdownToPmDoc(md: string): PmDoc {
  const tokens = marked.lexer(md);
  const content = blocksToPm(tokens);
  return { type: 'doc', content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }] };
}
