/**
 * 版間の文字（語）単位 diff (PBI-86)。
 *
 * ProseMirror JSON からテキストを抽出し、語単位の LCS で added / removed / equal の
 * トークン列を返す純粋関数。新規依存なし（自前の軽量 LCS）。履歴パネルの差分表示で
 * 旧版 → 現在の変化を色分けする。
 */

export type DiffPart = { kind: 'equal' | 'added' | 'removed'; text: string };

/** ProseMirror JSON ドキュメントから本文テキストを連結（段落間は改行）。 */
export function docToText(doc: unknown): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; text?: string; content?: unknown[] };
    if (n.type === 'text' && typeof n.text === 'string') out.push(n.text);
    if (Array.isArray(n.content)) {
      for (const c of n.content) walk(c);
      // ブロック境界に空白を入れて語が癒着しないように。
      if (n.type === 'paragraph' || n.type === 'heading') out.push('\n');
    }
  };
  walk(doc);
  return out.join('').replace(/\n{2,}/g, '\n').trim();
}

/** 語 + 空白を 1 トークンに（差分の粒度）。 */
function tokenize(s: string): string[] {
  return s.match(/\S+|\s+/g) ?? [];
}

/**
 * 2 つのテキストの語単位 diff。LCS テーブルを後ろから辿って added/removed/equal を
 * 構築する。O(n*m) だが版本文の規模なら十分。
 */
export function diffWords(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const n = a.length;
  const m = b.length;
  // LCS 長さテーブル
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }
  const parts: DiffPart[] = [];
  const push = (kind: DiffPart['kind'], text: string) => {
    const last = parts[parts.length - 1];
    if (last && last.kind === kind) last.text += text;
    else parts.push({ kind, text });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      push('equal', a[i]!);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      push('removed', a[i]!);
      i++;
    } else {
      push('added', b[j]!);
      j++;
    }
  }
  while (i < n) push('removed', a[i++]!);
  while (j < m) push('added', b[j++]!);
  return parts;
}
