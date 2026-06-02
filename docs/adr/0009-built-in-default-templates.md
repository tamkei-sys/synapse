# ADR-0009: 組み込みデフォルトテンプレートと props.doc からの Yjs seed

- 状態: 採択 (PBI-105)
- 日付: 2026-06-02
- 関係 PBI: PBI-105（PRJ-12 大和心ワークフローの取り込み）
- 関連: apps/api/src/lib/default-templates.ts / apps/sync/src/template-schema.ts / apps/sync/src/persistence.ts / ADR-0008

## 背景

ページ本文は Yjs (CRDT) が正本で、最新状態だけが `block_yjs_state` に
バイナリで入る。`props.doc` はそこから派生する JSON スナップショット
（検索 / MCP / REST 用、ADR-0008 と同じ）。

「全ワークスペースに最初から使える汎用テンプレート集を配りたい」（大和心
Notion の運用を一般化したもの）を実現するには、本文付きテンプレを表示・
編集可能にする必要がある。しかし Hocuspocus の `fetch` は
`block_yjs_state` が無いと null を返すだけで、`props.doc` からは何も
復元しない。よってテンプレに `props.doc` だけ入れても、そこから作った
ページは空で開き、初回 flush で props.doc が空スナップショットに上書き
されてしまう。

## 選択肢

### 本文付きテンプレの実体をどう用意するか

1. **Yjs バイナリを事前生成して定数同梱**
   - ✅ 実行時の依存追加・sync 変更ゼロで最も低リスク
   - ❌ ソース上は不透明な base64 blob、再生成にスクリプトが要る
2. **sync の `fetch` で props.doc から初期 Y.Doc を seed（採用）**
   - ✅ テンプレは可読な TipTap JSON で管理できる
   - ✅ 「props.doc はあるが Yjs state 未保存」のページ全般が正しく開く汎用改善
   - ✅ apps/sync は Node コンテナなので y-prosemirror / TipTap schema が使える
   - ❌ apps/sync に TipTap schema 依存を1組追加する／sync 挙動変更なので E2E が要る
3. **クライアント側で seed**
   - ❌ 複数クライアントの競合（二重 seed）が起きやすく Yjs では事故りやすい

## 決定

選択肢 **2** を採用する。

- `apps/sync/src/template-schema.ts`: 標準ノード（StarterKit + task list +
  table）だけの ProseMirror schema を `getSchema` で構築し、
  `seedStateFromDoc(doc)` で TipTap JSON → 初期 Yjs update に変換する。
  空 doc（空段落のみ）は null を返し、従来の挙動を保つ。
- `persistence.ts` の `fetch`: 保存 state が無ければ `block.props.doc` を
  見て、内容があれば seed した state を返す。
- `apps/api/src/lib/default-templates.ts`: 8 種の汎用テンプレ（作業計画書/
  作業報告書/調査報告書/個別作業実施報告書/コード修正計画書/手順書/技術
  仕様書/議事録）を TipTap JSON で定義し、`seedDefaultTemplates` が
  `builtinKey` で冪等に投入する。workspace.create がベストエフォートで呼ぶ。

## 制約・帰結

- テンプレ本文は **標準ノード限定**（callout / toggle / embed / math 等の
  自前ノードは使わない）。それらは通常編集で必ず Yjs state を得るので、この
  seed 経路は走らない。ユニットテストでノード種別を検査して逸脱を防ぐ。
- apps/sync に `@tiptap/core` / `@tiptap/starter-kit` / `@tiptap/extension-
  task-list|task-item` / `@tiptap/extension-table*` を追加（apps/web と同
  バージョン）。schema 用途のみで node view は不要。
- テンプレ内容は大和心の運用を一般化した汎用ひな形で、組織固有データは含め
  ない。
