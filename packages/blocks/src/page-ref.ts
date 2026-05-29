/**
 * pageRef 抽出ユーティリティ (PBI-73 バックリンク)。
 *
 * エディタ本文（TipTap / ProseMirror JSON）の中に埋まった `pageRef` inline
 * node（@page 参照, PBI-69）を歩いて、参照先 pageId の集合を返す純粋関数。
 * sync の保存フックがこれを使って page_link 索引を作り直し、API がバック
 * リンク（被参照）を逆引きする。
 *
 * ノードの形は page-ref-node.tsx と一致:
 *   { type: 'pageRef', attrs: { pageId, title } }
 */

/** doc を再帰的に歩いて pageRef の pageId をユニークに集める。 */
export function extractPageRefs(doc: unknown): string[] {
  const ids = new Set<string>();
  walk(doc, ids);
  return [...ids];
}

function walk(node: unknown, ids: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  const n = node as Record<string, unknown>;
  if (n['type'] === 'pageRef') {
    const attrs = n['attrs'];
    if (attrs && typeof attrs === 'object') {
      const pid = (attrs as Record<string, unknown>)['pageId'];
      if (typeof pid === 'string' && pid) ids.add(pid);
    }
  }
  const content = n['content'];
  if (Array.isArray(content)) {
    for (const child of content) walk(child, ids);
  }
}
