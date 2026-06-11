# ADR-0011: MCP からのドキュメント本文書き込み（sync の openDirectConnection 経由）

- 状態: 採択
- 日付: 2026-06-04
- 関係 PBI: （未起票）MCP 全操作化トランシェ — ドキュメント本文編集
- 関連: apps/sync/src/persistence.ts / template-schema.ts / auth.ts / index.ts、apps/mcp/src/tools.ts、[[ci-lint-test-and-e2e-structure]]、ADR は PR #51（`createServiceCaller` 基盤）の続き

## 背景

「Claude Code から MCP だけで SYNAPSE の全操作」を北極星に、PR #51 でページの**箱**操作（作成・改名・移動・ゴミ箱）を MCP に載せた。残るのが**本文編集**。

本文は通常の DB 値ではなく **Yjs(CRDT) の所有物**で、`apps/sync`(Hocuspocus) だけが扱う。`block_yjs_state.state` にバイナリで持ち、`persistence.store` が編集確定時に `props.doc` スナップショット・`version`・バックリンク索引を派生させる。`apps/api`/MCP は Yjs ライブラリを持たず、本文を直接書けない。

雑に `block_yjs_state` を上書きすると、編集者が接続中の Hocuspocus インメモリ文書と食い違い相手の編集を壊す。CLAUDE.md は「Yjs と並行する同期機構を足すな」と明記。よって**協調安全な書き込み経路**を定める。

## 選択肢

### 1. 書き込み経路

1. **MCP を Hocuspocus WS クライアントにする** — ❌ MCP に Yjs/y-prosemirror/スキーマ/WS ライフサイクルを抱える。stdio の短命プロセスに重い。sync 認証はセッショントークン前提で MCP は持たない
2. **`block_yjs_state` を DB 直書き** — ❌ 接続中の編集者と divergence。CLAUDE.md 違反。安全に書けるのは「誰も開いていない時」だけで保証できない
3. **sync 内で `server.openDirectConnection('page:'+blockId)`（採用）** — ✅ サーバ内トランザクションで `'default'` fragment を変更。**生きた編集者へ broadcast＋既存 `store` で永続/スナップショット/version/バックリンク自動更新**。Yjs 知見が既にある場所に閉じる。**Phase 0 spike で実証済み**（append→`props.doc` 反映を確認）

### 2. MCP ↔ sync 認証

sync の `onAuthenticate` は Better-Auth **セッショントークン**しか受けない（token→session→user→所属）。MCP はワークスペーススコープの **API トークン**＋解決済み `userId` を持つがセッションは無い。

1. MCP がセッションを発行 — ❌ 実セッションを乱造
2. sync が API トークンを検証 — △ sync を api-token 系に結合、面が増える
3. **共有内部シークレット＋ sync 側で所属/権限チェック（採用）** — ✅ 内部 RPC を `SYNC_INTERNAL_SECRET` ヘッダでゲート。呼び出しは `{blockId, actorUserId, content, mode}` を渡し、sync が「block は page か」「actorUserId はその WS の非 viewer メンバーか」を検証（`auth.ts` の所属判定を再利用）。エンドポイントは**内部バインド限定**（公開しない）

### 3. 入力フォーマット

1. ProseMirror JSON 直接 — ❌ LLM に書かせるのが酷
2. プレーンテキスト — △ 段落のみ
3. **Markdown → PM JSON → Yjs（採用）** — ✅ エディタと同じノード/マーク名へ。実装時に判明: `@tiptap/html` の `generateJSON` は **DOM が必要**で Node の sync では動かない。よって `marked` の **lexer のトークン木を PM JSON へ直接マッピング**する（DOM 非依存）。最終的に `pmNodeToY` で `'default'` fragment に組む

### 4. 操作

- **append（末尾追記）** と **set/replace（全置換）** を v1 とする。任意位置 insert は CRDT アドレッシングが要るため範囲外。

## 決定

- 経路 **1-3 / 2-3 / 3-3** を採用。`apps/sync` に**認証付き内部 HTTP エンドポイント**を追加し、`openDirectConnection` で `'default'` fragment に append/replace を適用。
- MCP に **`synapse_append_doc {pageId, markdown}`** と **`synapse_set_doc {pageId, markdown}`**（⚠destructive、全置換）。スコープは `write_page`（本文も「箱」と同じページ書き込み権限とする）。
- 依存追加（本 ADR で承認）: `apps/sync` に `marked`(MIT, ^14.1.4、apps/web と同版) のみ。用途は md→PM 変換（lexer→PM JSON、DOM 非依存）。`@tiptap/html` は DOM 必須のため不採用。
- `actorUserId` は **任意**。指定時はその user の非 viewer 所属を強制（MCP 経路）。省略時は共有シークレットで認証済みの信頼インフラからのシステム書き込みとして許可（E2E / 将来のシステム処理）。block が page か否かは常に検証。
- 設定: `SYNC_INTERNAL_URL` / `SYNC_INTERNAL_SECRET`（MCP 側）、`SYNC_INTERNAL_SECRET`（sync 側）。dev は `.dev.vars`/compose に dev-only 値。
- フェーズ: **Phase 1** = 本 ADR ＋ sync エンドポイント＋認証（PM JSON を受ける最小形）。**Phase 2** = md パイプライン＋ MCP 2 ツール。**Phase 3** = E2E。

## 制約・帰結

- **E2E 必須**（CLAUDE.md「Yjs/Block schema に触る変更は E2E を PR に」）: ①`append_doc`→ページを開いて追記が見える ②2 タブ同時編集で append が生きた編集者に反映。
- spike で初回 fetch/seed 経路に `Invalid access: Add Yjs type to a document before reading data.` の警告が出た。致命ではないが本実装で原因（空ドキュメントの fragment 読み取り順）を潰す。
- エンドポイントは内部限定。公開ルートには出さない。append は文書末尾固定、set は全置換（編集中の差分は CRDT がマージ）。
- スキーマは web エディタ（StarterKit＋task list＋table）に一致させる。範囲外ノード（callout/toggle/embed/math）を含む md は無視またはプレーン化（`seedStateFromDoc` の try/catch と同方針）。
- 本文の**読み取り**は別途不要: `props.doc` スナップショットが既に最新本文を持つので、必要なら `synapse_get_page` を本文込みに拡張できる（別 PBI）。

## 追補（2026-06-11）: PBI / SBI / Project / Sprint 本文への拡張

`/b/$blockId` 詳細ルートは project / sprint / pbi / sbi にも PageEditor を出し、`block:<id>` という Yjs ドキュメント名で本文を編集できる（auth.ts は当初からこの「アイテム自身がドキュメント」設計を許可済み、persistence も `parseDocumentName` で blockId を取るだけなので両プレフィックスを同一に扱う）。一方、内部 doc-write は「block は page か」を検証し `'page:'+blockId` を固定で開いていたため、MCP から PM アイテムの本文に書けなかった。これを次のとおり一般化する。

- **対象型**: 本文を持つ `page / project / sprint / pbi / sbi` のみ（`BODY_BLOCK_TYPES`）。sheet 等それ以外の型は **400**（Yjs ドキュメントの用途が異なり、prosemirror fragment を書き込むとモデルを壊すため）。存在しない block は 404。
- **ドキュメント名**: 生きた編集者が開いている名前に合わせる — `page` → `page:<id>`（`/p/` ルート）、それ以外 → `block:<id>`（`/b/` ルート）。名前を間違えると別のインメモリ文書に書いて divergence するので、ここが本質。
- **MCP 入力**: `synapse_append_doc` / `synapse_set_doc` は `blockId` を正とし、`pageId` を後方互換エイリアスとして受理（どちらか必須、`blockId` 優先）。
- **スコープ**: 据え置きで `write_page`。本文編集は「ドキュメント」能力とみなす（PBI のメタデータ status 等は従来どおり `write_pbi`）。細分化が要るなら別 PBI。
- **メンバーシップ検証・共有シークレット・エンドポイントの内部限定**: 変更なし。
- **E2E**: `e2e/da-doc-append.spec.ts` に PBI 本文ケースを追加（`/b/` の生きたエディタへの broadcast と reload 永続を検証）。
