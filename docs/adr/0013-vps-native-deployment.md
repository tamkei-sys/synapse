# 0013 — VPS ネイティブデプロイ（Workers API の Node アダプタ）

- Status: accepted
- Date: 2026-06-12

## Context

本番ターゲットは Cloudflare Workers（[design.md](../design.md)）だが、当面のステージング
/デモ環境として YOKOITO の Xserver VPS（Ubuntu 24.04, 4 vCPU / 6GB RAM / PostgreSQL 16.14）
に間借りデプロイすることになった。

VPS には Docker がなく、既存の YOKOITO 本番・ステージング（Node 20 + nginx +
ローカル PostgreSQL）が同居している。間借りの立場として **既存環境に一切影響を
与えない**ことを最優先する。具体的には:

- システムの Node 20 / 既存 nginx server / 既存 DB クラスタ設定には触れない
- 使用ポート（80/443/3000/3001/8080）と衝突しない
- 追加リソースはすべて `synapse` 名前空間（DB ロール、systemd unit、nginx site）に閉じる

## Decision

### API: `@hono/node-server` + untyped ESM グルー

`apps/api` に `@hono/node-server` を runtime 依存として追加し、`apps/api/server.mjs`
（約 50 行の素 ESM）が `dist/index.js` の Workers エントリをそのまま serve する。

- `src/index.ts`（Workers エントリ）が唯一の真実のまま。Node 用に分岐しない。
- `tsconfig.json` は `types: ["@cloudflare/workers-types"]` を維持 — Node 型を
  Workers コンパイル空間に混ぜないため、グルーだけ意図的に untyped とする。
- `ExecutionContext` は互換実装を注入する（Node はイベントループが pending promise を
  生かし続けるので、`waitUntil` は rejection のログだけで足りる）。
- Cron Triggers（`* * * * *`）は `setInterval(60s)` で `worker.scheduled` を呼んで代替。

検討した代替案:

- **VPS でも `wrangler dev`**: dev サーバーの長期運用は想定外（watcher 常駐・更新確認）。却下。
- **Node 用 TS エントリ + 専用 tsconfig**: dist への自己参照 import と composite 制約が
  絡んで設定が肥大する。50 行のグルーに型を付けるコストに見合わない。却下。

### ランタイムとミドルウェア

- 専用 Node 22.22.3（mise.toml と同一）を `/home/deploy/synapse/runtime/node` に
  tarball 展開。システム Node 20 とは PATH も含め完全分離（PATH 注入は systemd unit 内のみ）。
- PostgreSQL は既存 16.14 クラスタに `synapse` ロール + `synapse_prod` DB +
  `pgvector` 拡張を追加するだけ。
- Typesense 27.1 は公式 deb を導入し `127.0.0.1:8108` にバインド。
- nginx に `:8081` の専用 server を追加。web 静的配信 + `/trpc` `/api` `/healthz` を
  api(127.0.0.1:8790) へ、`/sync` (WebSocket upgrade) を sync(127.0.0.1:8791) へプロキシ。
  **web と API が同一オリジンになるので CORS・cookie の特殊扱いが消える。**
- sync は新設の `SYNC_HOST` で `127.0.0.1` にバインド（既定 `0.0.0.0` は devcontainer
  互換のため維持）。

### デプロイ手順の置き場所

`infra/vps/` に setup.sh（初回）/ deploy.sh（毎回）/ systemd unit / nginx conf を置く。
ソース転送は `git archive HEAD | ssh ... tar -x`（コミット済み内容のみが届く）。

## Consequences

- Workers 固有機能（Queues / R2 / cc Container DO / Cron Triggers ネイティブ）は
  この環境では無効のまま。コードは `undefined` バインディングに対するフォールバックを
  既に持っている（cc は sandbox-stub 等）。
- GitHub webhook 受信は公開 HTTPS が前提のため、この環境では未設定。
- `wrangler deploy` 経路は無傷。将来 Workers 本番に移すときは `infra/vps/` を消すだけ。
- HTTP（非 TLS）公開なので、本利用が始まる前に HTTPS 化（サブドメイン + Let's Encrypt か
  Cloudflare Tunnel）を判断する。
