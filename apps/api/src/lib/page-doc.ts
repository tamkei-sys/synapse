/**
 * Page document shape.
 *
 * The canonical content of a page is a TipTap / ProseMirror JSON document
 * stored at `block.props.doc`. We keep the runtime schema loose (jsonb on
 * the DB side, `z.record(z.unknown())` here) — TipTap's own validators
 * catch malformed input on the client, and re-validating on every write
 * would force us to mirror every TipTap extension's node spec.
 */
import { z } from 'zod';

export const pageDocSchema: z.ZodType<PageDoc> = z.object({
  type: z.literal('doc'),
  content: z.array(z.unknown()).optional(),
});

export type PageDoc = {
  type: 'doc';
  content?: unknown[];
};

/** Empty document used when a page is first created. */
export const EMPTY_DOC: PageDoc = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
    },
  ],
};

/** Shape of `block.props` for a page block. */
export const pagePropsSchema = z.object({
  title: z.string(),
  doc: pageDocSchema,
});

export type PageProps = z.infer<typeof pagePropsSchema>;

/**
 * doc 先頭のテキストを max 文字まで抜き出す。版履歴 (PBI-54) 一覧の
 * プレビュー用。テキストノードを文書順に拾い、連続空白を 1 つに畳む。
 * 不正な入力 (null / 非オブジェクト) では空文字を返す。
 */
export function extractTextPreview(doc: unknown, max = 100): string {
  const parts: string[] = [];
  const walk = (node: unknown): void => {
    if (parts.join('').length >= max) return;
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && typeof n.text === 'string') parts.push(n.text);
    if (Array.isArray(n.content)) for (const child of n.content) walk(child);
  };
  walk(doc);
  const text = parts.join('').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max) : text;
}
