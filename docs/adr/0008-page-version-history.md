# ADR-0008: ページ履歴は doc スナップショット + クライアント setContent で復元する

- 状態: 採択 (PBI-54)
- 日付: 2026-05-30
- 関係 PBI: PBI-54
- 関連: apps/sync/src/persistence.ts / docs/design.md

## 背景

ページ本文は Yjs (CRDT) で編集され、最新状態だけが `block_yjs_state` に
バイナリで入る。履歴は持たない。「N 分前の状態に戻したい」を実現するには
版の保存と、CRDT と矛盾しない復元方法が要る。

## 選択肢

### 版の保存形式

1. Yjs バイナリ state を版ごとに保存
   - ✅ 完全な CRDT 状態を保持
   - ❌ サイズが大きい、復元時の扱いが難しい
2. ProseMirror JSON スナップショットを保存 (**採択**)
   - ✅ 軽い。検索 / プレビューにもそのまま使える
   - ✅ store フックが既に同じ snapshot を作っている（再利用できる）
   - ⚠️ 文字単位の編集履歴は失う（版 = 点のスナップショット）→ 要件上 OK

### 復元方法

1. 過去の Yjs state を `block_yjs_state` に上書き
   - ❌ CRDT では機能しない。接続中クライアントの新しい update に負けて
     内容が復活する。サーバ主導でメモリ上の Y.Doc も差し替える必要があり脆い
2. クライアント主導 setContent (**採択**)
   - ✅ `getVersion` で過去 doc を取り、`editor.commands.setContent(doc)` で
     「現在ドキュメントへの新しい変更」として Yjs に書き込む
   - ✅ Collaboration 拡張が接続中の全クライアントに伝播し、CRDT として収束
   - ✅ 復元操作が新しい版として自然に記録される

## 決定

- `page_version(id, block_id, workspace_id, doc, kind, created_by, created_at)`
  を追加（migration 0014）。`doc` は ProseMirror JSON、`kind` は `'auto' | 'manual'`
- **自動版**: sync の store フックで、前回版から 5 分以上空いていれば追加。
  1 ページ 50 版を上限に古い `auto` を間引く（`manual` は残す）
- **手動版**: `block.saveVersion`（`created_by` = 実行ユーザー）
- **復元**: クライアントが `block.getVersion` → `editor.commands.setContent(doc)`
- 版は `doc` のみ保持し、Yjs バイナリ state は持たない

## 影響

- sync が `page_version` に書く（`@synapse/schema` 経由。新規 dep ではない）
- 版は点スナップショット。文字単位の diff / blame は将来の別 PBI
- 保持上限 50 / 自動間隔 5 分はハードコード。UI での明示・調整は将来
