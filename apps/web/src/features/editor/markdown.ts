/**
 * Markdown ↔ HTML 変換 (PBI-33)。
 *
 * - **MD → HTML**: `marked` を使う。同期 API のみ呼ぶので「paste で貼った
 *   テキストを TipTap に流し込む」用途で十分早い。
 * - **HTML → MD**: TipTap の JSON ドキュメントから直接シリアライズする。
 *   外部の turndown 等を入れると 30KB 増えるので、サポートするノード
 *   (paragraph / heading / bullet/ordered list / task list / blockquote /
 *   code block / horizontal rule / link / bold / italic / strike /
 *   underline / code / pageRef / pbiRef / sbiRef / sheetEmbed) だけ自力で
 *   書く。未対応ノードはタグ名だけ HTML 風にエスケープしてフォールバック。
 *
 * 「整形タイミング」設計:
 *   - typing 中の inline shortcuts (`**bold**`, `# h1`, `> q`) は
 *     TipTap StarterKit の input rules が即時整形する。
 *   - paste は `looksLikeMarkdown(plain)` で判定して MD なら HTML 化、
 *     違うなら TipTap のデフォルト (HTML clipboard 優先) に委ねる。
 *   - 選択中は BubbleMenu で B/I/U/S/Code/Link を即時適用。
 *   - エクスポートはユーザー操作のときだけ → `editor.commands` から直接
 *     toMarkdown() を呼ぶ。
 */
import { marked, type Tokens } from 'marked';
import type { JSONContent } from '@tiptap/core';

// ── Markdown 判定 ─────────────────────────────────────────────

const MD_HINTS = [
  /^#{1,6}\s/m, // # heading
  /^\s*[-*+]\s/m, // - bullet
  /^\s*\d+\.\s/m, // 1. ordered
  /^>\s/m, // > blockquote
  /```[\s\S]*?```/, // fenced code
  /\*\*[^*\n]+\*\*/, // **bold**
  /\[[^\]\n]+\]\([^)\n]+\)/, // [link](url)
  /^---\s*$/m, // hr
  /^\s*- \[[ x]\]\s/im, // task list
];

/**
 * 「これはマークダウンっぽい」と判断する。誤検知は害なので 2 ヒント以上の
 * マッチを要求。1 行だけのプレーンテキストは絶対に MD 扱いしない。
 */
export function looksLikeMarkdown(text: string): boolean {
  if (!text || text.length < 4) return false;
  // 単一行で外部リンクすらない場合は plain。
  if (!text.includes('\n') && !/[[`*#>-]/.test(text)) return false;
  let hits = 0;
  for (const r of MD_HINTS) {
    if (r.test(text)) hits++;
    if (hits >= 2) return true;
  }
  // GFM check: 1 ヒットでも fenced code / task list / heading なら確定。
  if (/```[\s\S]*?```/.test(text)) return true;
  if (/^#{1,6}\s/m.test(text)) return true;
  if (/^\s*- \[[ x]\]\s/im.test(text)) return true;
  return false;
}

// ── MD → HTML ─────────────────────────────────────────────────

marked.setOptions({
  gfm: true,
  breaks: false,
});

/**
 * Markdown text → HTML string. 同期で呼べる範囲のオプションだけ使う。
 * 失敗したら元テキストの <p> 包みで返す（壊れた MD でユーザーの貼り付け
 * 操作自体を失敗させたくない）。
 */
export function markdownToHtml(text: string): string {
  try {
    const out = marked.parse(text, { async: false });
    return typeof out === 'string' ? out : String(out);
  } catch {
    return `<p>${escapeHtml(text)}</p>`;
  }
}

// ── TipTap JSON → Markdown ───────────────────────────────────

type Node = JSONContent;
type Mark = { type: string; attrs?: Record<string, unknown> };

/**
 * TipTap の `editor.getJSON()` 結果を Markdown に変換する。
 */
export function tiptapJsonToMarkdown(doc: Node | undefined | null): string {
  if (!doc || !doc.content) return '';
  return doc.content.map((n) => renderBlock(n)).join('\n\n').trim() + '\n';
}

function renderBlock(node: Node, depth = 0): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content);
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.['level'] ?? 1)));
      return `${'#'.repeat(level)} ${renderInline(node.content)}`;
    }
    case 'bulletList':
      return (node.content ?? [])
        .map((li) => renderListItem(li, depth, '- '))
        .join('\n');
    case 'orderedList': {
      const start = Number(node.attrs?.['start'] ?? 1);
      return (node.content ?? [])
        .map((li, i) => renderListItem(li, depth, `${start + i}. `))
        .join('\n');
    }
    case 'taskList':
      return (node.content ?? [])
        .map((li) => {
          const checked = li.attrs?.['checked'] === true;
          const prefix = checked ? '- [x] ' : '- [ ] ';
          return renderListItem(li, depth, prefix);
        })
        .join('\n');
    case 'blockquote':
      return (node.content ?? [])
        .map((c) => renderBlock(c, depth))
        .join('\n\n')
        .split('\n')
        .map((l) => `> ${l}`)
        .join('\n');
    case 'codeBlock': {
      const lang = String(node.attrs?.['language'] ?? '');
      const body = (node.content ?? []).map((c) => c.text ?? '').join('');
      return `\`\`\`${lang}\n${body}\n\`\`\``;
    }
    case 'horizontalRule':
      return '---';
    case 'hardBreak':
      return '  \n';
    case 'callout': {
      // Callout は GFM に無いので blockquote にダウングレード。tone を頭に出す。
      const tone = String(node.attrs?.['tone'] ?? 'info');
      const body = (node.content ?? [])
        .map((c) => renderBlock(c, depth))
        .join('\n\n');
      return `> **[${tone}]**\n` + body.split('\n').map((l) => `> ${l}`).join('\n');
    }
    case 'toggle': {
      // toggle → summary を太字行、details を本文に。
      const summary = node.content?.[0];
      const details = node.content?.[1];
      const head = summary ? renderInline(summary.content) : 'トグル';
      const body = details
        ? (details.content ?? []).map((c) => renderBlock(c, depth)).join('\n\n')
        : '';
      return `**▸ ${head}**\n\n${body}`;
    }
    // SYNAPSE 独自ノード
    case 'pbiRef':
      return `[PBI-ref ${node.attrs?.['blockId'] ?? ''}](/b/${node.attrs?.['blockId'] ?? ''})`;
    case 'sheetEmbed':
      return `[Sheet ${node.attrs?.['blockId'] ?? ''}](/b/${node.attrs?.['blockId'] ?? ''})`;
    case 'prDiffEmbed':
      return `[PR ${node.attrs?.['prUrl'] ?? ''}](${node.attrs?.['prUrl'] ?? ''})`;
    case 'pageRef':
      return `[${node.attrs?.['title'] ?? 'page'}](/p/${node.attrs?.['pageId'] ?? ''})`;
    default:
      // 未対応はテキスト抽出だけ
      return renderInline(node.content);
  }
}

function renderListItem(li: Node, depth: number, prefix: string): string {
  const inner = (li.content ?? [])
    .map((c, i) => (i === 0 && c.type === 'paragraph' ? renderInline(c.content) : renderBlock(c, depth + 1)))
    .join('\n');
  // 2 行目以降はインデント。
  const indent = '  '.repeat(depth);
  const [first, ...rest] = inner.split('\n');
  const tail = rest.length ? '\n' + rest.map((l) => `${indent}  ${l}`).join('\n') : '';
  return `${indent}${prefix}${first ?? ''}${tail}`;
}

function renderInline(content: Node[] | undefined): string {
  if (!content) return '';
  return content
    .map((node) => {
      if (node.type === 'text') return applyMarks(escapeMd(node.text ?? ''), (node.marks ?? []) as Mark[]);
      if (node.type === 'hardBreak') return '  \n';
      if (node.type === 'pbiRef')
        return `[PBI-ref ${node.attrs?.['blockId'] ?? ''}](/b/${node.attrs?.['blockId'] ?? ''})`;
      if (node.type === 'pageRef')
        return `[${node.attrs?.['title'] ?? 'page'}](/p/${node.attrs?.['pageId'] ?? ''})`;
      return renderInline(node.content);
    })
    .join('');
}

function applyMarks(text: string, marks: Mark[]): string {
  let out = text;
  for (const m of marks) {
    switch (m.type) {
      case 'bold':
        out = `**${out}**`;
        break;
      case 'italic':
        out = `*${out}*`;
        break;
      case 'strike':
        out = `~~${out}~~`;
        break;
      case 'underline':
        out = `<u>${out}</u>`;
        break;
      case 'code':
        out = `\`${out}\``;
        break;
      case 'link': {
        const href = String(m.attrs?.['href'] ?? '');
        out = `[${out}](${href})`;
        break;
      }
    }
  }
  return out;
}

// ── ヘルパー ───────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeMd(s: string): string {
  // Markdown 特殊文字を最低限。バックスラッシュ自体は MD で意味があるので
  // 過剰エスケープせず、出力で問題になる * _ ` [ ] だけ。
  return s.replace(/([\\*_`[\]])/g, '\\$1');
}

// eslint がスキーマ非依存と判定するための型 re-export
export type MarkdownTokens = Tokens.Generic;
