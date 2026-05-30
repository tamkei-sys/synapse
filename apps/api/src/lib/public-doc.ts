/**
 * 公開ページ (PBI-56) の doc サニタイズ + 共有トークン。
 *
 * 顧客向け read-only 公開では、社内向けの埋め込み (シート / PR / PBI 参照 /
 * 内部ページ参照 / コメント) を doc から除去する。許可リスト方式 (デフォルト
 * 拒否) で、表示に必要な基本ノード/マークだけを残す。これにより
 *   ① 社内データの漏洩を防ぐ (埋め込みノードは丸ごと落ちる)
 *   ② read-only エディタが知らないノードでパースクラッシュするのを防ぐ
 *   ③ link href / image src の危険スキーム (javascript: / data:text/html 等)
 *      を弾いて XSS を防ぐ
 * の三つを同時に満たす。許可リストは read-only レンダラ
 * (apps/web .../editor/public-page-editor.tsx) の拡張セットと一致させること。
 */

type PmMark = { type: string; attrs?: Record<string, unknown> };
type PmNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: PmNode[];
  marks?: PmMark[];
  text?: string;
};

export type PublicDoc = { type: 'doc'; content: PmNode[] };

const ALLOWED_NODES = new Set<string>([
  'doc',
  'paragraph',
  'text',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'hardBreak',
  'image',
  'table',
  'tableRow',
  'tableHeader',
  'tableCell',
  'callout',
  'toggle',
  'toggleSummary',
  'toggleDetails',
  'tocBlock',
  'inlineMath',
  'mathBlock',
  'dateMention',
]);

const ALLOWED_MARKS = new Set<string>([
  'bold',
  'italic',
  'strike',
  'code',
  'underline',
  'link',
  'textStyle',
  'highlight',
]);

/** http(s) / mailto / 相対パス・アンカー のみ許可（javascript: 等を弾く）。 */
function safeHref(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (/^https?:/i.test(v) || /^mailto:/i.test(v)) return v;
  if (v.startsWith('/') || v.startsWith('#')) return v;
  return null;
}

/** http(s) / data:image のみ許可（data:text/html 等を弾く）。 */
function safeImageSrc(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (/^https?:/i.test(v)) return v;
  if (/^data:image\//i.test(v)) return v;
  return null;
}

function colorAttrs(attrs: Record<string, unknown> | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const color = attrs?.['color'];
  if (typeof color === 'string') out['color'] = color;
  return out;
}

function sanitizeMark(mark: PmMark): PmMark | null {
  if (!mark || typeof mark.type !== 'string' || !ALLOWED_MARKS.has(mark.type)) return null;
  if (mark.type === 'link') {
    const href = safeHref(mark.attrs?.['href']);
    if (!href) return null; // 危険な href はマークごと落とす
    return { type: 'link', attrs: { href } };
  }
  if (mark.type === 'textStyle' || mark.type === 'highlight') {
    const attrs = colorAttrs(mark.attrs);
    return Object.keys(attrs).length ? { type: mark.type, attrs } : { type: mark.type };
  }
  return { type: mark.type };
}

/** 許可ノードの属性だけを安全に通す。構造属性は維持しつつ危険値を弾く。 */
function sanitizeAttrs(
  type: string,
  attrs: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (type === 'heading') {
    const level = attrs?.['level'];
    return { level: typeof level === 'number' && level >= 1 && level <= 6 ? level : 1 };
  }
  if (!attrs) return undefined;
  return attrs;
}

function sanitizeMarks(marks: unknown): PmMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const out = marks.map((m) => sanitizeMark(m as PmMark)).filter((m): m is PmMark => m !== null);
  return out.length ? out : undefined;
}

function sanitizeNode(node: PmNode): PmNode | null {
  if (!node || typeof node.type !== 'string' || !ALLOWED_NODES.has(node.type)) return null;

  // text は非空文字列が必須（ProseMirror が空 text を拒否するため）。
  if (node.type === 'text') {
    if (typeof node.text !== 'string' || node.text.length === 0) return null;
    const marks = sanitizeMarks(node.marks);
    return marks ? { type: 'text', text: node.text, marks } : { type: 'text', text: node.text };
  }

  // image は安全な src が無ければ丸ごと落とす。
  if (node.type === 'image') {
    const src = safeImageSrc(node.attrs?.['src']);
    if (!src) return null;
    const attrs: Record<string, unknown> = { src };
    if (typeof node.attrs?.['alt'] === 'string') attrs['alt'] = node.attrs['alt'];
    if (typeof node.attrs?.['title'] === 'string') attrs['title'] = node.attrs['title'];
    return { type: 'image', attrs };
  }

  const out: PmNode = { type: node.type };
  const attrs = sanitizeAttrs(node.type, node.attrs);
  if (attrs) out.attrs = attrs;
  const marks = sanitizeMarks(node.marks);
  if (marks) out.marks = marks;
  if (Array.isArray(node.content)) {
    const content = node.content
      .map((c) => sanitizeNode(c))
      .filter((n): n is PmNode => n !== null);
    if (content.length) out.content = content;
  }
  return out;
}

/**
 * ProseMirror JSON を公開向けにサニタイズする。許可外ノードは丸ごと、許可外
 * マークは剥がす。doc でない入力は空 doc を返す（堅牢化）。
 */
export function sanitizePublicDoc(doc: unknown): PublicDoc {
  const root = doc as PmNode | null;
  if (!root || typeof root !== 'object' || root.type !== 'doc' || !Array.isArray(root.content)) {
    return { type: 'doc', content: [] };
  }
  const content = root.content.map((c) => sanitizeNode(c)).filter((n): n is PmNode => n !== null);
  return { type: 'doc', content };
}

const SHARE_TOKEN_BYTES = 16; // 128 bits — URL に載せる推測不能なトークン

/**
 * 公開共有 URL 用のトークンを生成する。crypto.getRandomValues 由来の 128bit を
 * hex 化（URL-safe）。api-token と違いハッシュ化はしない — これは秘密鍵ではなく
 * 「知っていればそのページだけ読める」ケイパビリティ URL なので、失効は
 * enabled フラグと再生成で行う。
 */
export function generateShareToken(): string {
  const bytes = new Uint8Array(SHARE_TOKEN_BYTES);
  crypto.getRandomValues(bytes);
  let out = '';
  for (const b of bytes) out += b.toString(16).padStart(2, '0');
  return out;
}
