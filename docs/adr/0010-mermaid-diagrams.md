# ADR-0010: Mermaid 図のレンダリング（遅延ロード + strict セキュリティ）

- 状態: 採択 (PBI-116)
- 日付: 2026-06-03
- 関係 PBI: PBI-116（PRJ-9 プロダクト体験の磨き込み）
- 関連: apps/web/src/features/editor/mermaid-node.tsx / mermaid-render.ts / public-page-editor.tsx / apps/api/src/lib/public-doc.ts

## 背景

Notion / GitHub / Obsidian と同様に、ドキュメント内で ` ```mermaid ` 記法から
フローチャート・シーケンス図・ガント等を描画したい。現状コードブロックは
lowlight でハイライトされるだけで、`mermaid` 言語を書いても図にはならない。

`mermaid` は実行時依存として大きい（解析器 + dagre 等のレイアウトエンジンで
数百 KB〜）。CLAUDE.md 上、ランタイム依存の追加は ADR 必須。バンドル戦略と
セキュリティ（描画 SVG の XSS 面、特に公開ページ）を決める必要がある。

## 選択肢

### 1. 図の永続表現（どのノードに格納するか）

1. **既存 `codeBlock`（language=mermaid）を decoration/nodeView で描画**
   - ✅ markdown ` ```mermaid ` と自然に往復する
   - ❌ CodeBlockLowlight は ProseMirror plugin で装飾しており、nodeView で
     描画を奪うと他言語のハイライトと競合する。実装が複雑で壊れやすい
2. **専用 `mermaidBlock` atom ノード（採用）**
   - ✅ 既存 `mathBlock`（KaTeX）と完全に同型 — atom + `code` 属性 +
     ReactNodeView + クリック編集 + エラーフォールバック。実績ある設計
   - ✅ 描画とコードブロックのハイライトが干渉しない
   - ❌ markdown は export のみ対応（import で ` ```mermaid ` → ノードへの
     自動変換はしない）。これは `mathBlock`（`$$` を export のみ）と同じ割り切り

### 2. バンドル戦略

- **動的 `import('mermaid')`（採用）**: 初期バンドルに乗せず、図が最初に
  描画される時だけ別チャンクで取得。module レベルで import 結果を 1 度だけ
  キャッシュする。KaTeX（同期 import）と違い `mermaid.render` は非同期なので
  ReactNodeView 側も useEffect で描画する。

### 3. セキュリティ（描画 SVG）

- **`securityLevel: 'strict'` を内部/公開とも一律採用（採用）**: HTML ラベル
  無効・`<script>` 除去・クリックイベント無効。mermaid が公式に保証する
  サニタイズ経路。`mathBlock` が KaTeX の `dangerouslySetInnerHTML` を信頼する
  のと同じ構図で、SVG 文字列をそのまま埋め込む。
- 公開ページは `public-doc.ts` の許可リストに `mermaidBlock` を追加し、`code`
  属性のみ（文字列・長さ上限）を通す。描画は read-only エディタが strict で行う。

## 決定

- 選択肢 **1-2 / 2 / 3** を採用。専用 `mermaidBlock` ノード、`mermaid` 動的
  import、`securityLevel: 'strict'` 一律。
- `apps/web` に `mermaid`（mermaid-js, MIT, ^11）を追加。用途は描画のみ。
- `/mermaid` スラッシュはスターター図（`flowchart TD`）を挿入して即描画。
  空コードは編集用 textarea を開く。構文エラーはメッセージ表示にフォールバック。
- ダークモードは描画時に `documentElement` の `dark` クラスを見て
  `theme: 'dark' | 'default'` を切り替える。

## 制約・帰結

- `mermaid` は遅延ロードのため、図を含むページの初回描画にわずかな遅延が出る
  （チャンク取得 + パース）。読み込み中はプレースホルダを表示する。
- markdown import（` ```mermaid ` → ノード）は範囲外。貼り付けるとコードブロック
  として残る（描画はされない）。必要になれば後続 PBI で paste 変換を足す。
- 公開ページの XSS 耐性は mermaid の strict モードに依存する。strict を緩める
  設定（loose/antiscript）は入れない。
