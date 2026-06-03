/**
 * mermaid を遅延ロードして図を SVG に変換するラッパー (PBI-116 / ADR-0010)。
 *
 * mermaid は数百 KB と大きいので動的 import で初期バンドルから外し、最初の
 * 描画時だけ別チャンクで取得する。import 結果は module レベルで 1 度だけ
 * キャッシュする。SVG は securityLevel:'strict' で生成し、HTML ラベル無効・
 * <script> 除去で XSS 面を mermaid の保証に委ねる（内部 / 公開とも一律）。
 *
 * KaTeX（同期 import）と違い mermaid.render は非同期なので、呼び出し側
 * （ReactNodeView）は useEffect で描画する。
 */
// 型のみの import は実行時に消えるので、遅延ロード（動的 import）の効果は保たれる。
import type { Mermaid } from 'mermaid';

let mermaidPromise: Promise<Mermaid> | null = null;
let renderSeq = 0;

async function loadMermaid(): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m.default);
  }
  return mermaidPromise;
}

export type MermaidResult = { ok: true; svg: string } | { ok: false; error: string };

/**
 * mermaid ソースを SVG にする。失敗しても throw せず error メッセージを返す。
 * 空ソースは空 SVG（描画なし）。
 */
export async function renderMermaid(code: string, dark: boolean): Promise<MermaidResult> {
  const source = code.trim();
  if (!source) return { ok: true, svg: '' };
  try {
    const mermaid = await loadMermaid();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: dark ? 'dark' : 'default',
    });
    renderSeq += 1;
    const { svg } = await mermaid.render(`synapse-mermaid-${renderSeq}`, source);
    return { ok: true, svg };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: message || 'Mermaid 構文エラー' };
  }
}
