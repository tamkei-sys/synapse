# ADR-0007: cc セッションは Cloudflare Container 内で動かす

- 状態: 採択 (PBI-19)
- 日付: 2026-05-29
- 関係 PBI: PBI-19, PBI-13 (一部)
- 関連: CLAUDE.md §6 / docs/security.md

## 背景

S9 で「PBI から cc セッションを起動する」UX を入れたが、実体はローカル
`startStubSession` がタイマーで queued → running → succeeded を演じるだけの
モックだった。本物の cc を動かすには下記の制約を満たすサンドボックスが要る。

- `cc` を任意のリポジトリで走らせる（git/clone, write, branch, push）
- ワークスペースごとに**完全に隔離**された FS / network
- ユーザー認証情報（`~/.aws`, `~/.ssh`, `~/.gcloud`, `~/.kube`,
  `~/.docker/config.json`, `.env*`, `*.pem`）が**絶対に**混入しないこと
- セッション終了で痕跡を破棄
- 同時実行を workspace x N で制限、月間予算で停止
- API Worker が `waitUntil` でアタッチして「動いている」ことを観察できる

## 選択肢

### 1. ローカル node:vm / worker_threads
- ❌ ファイルシステム隔離が無い
- ❌ Worker isolate の中で cc 等の git CLI を spawn できない

### 2. 自前 Kubernetes Pod
- ✅ 隔離は完璧
- ❌ オーケストレーション / コスト / 運用負荷が大きすぎる

### 3. Cloudflare Container DO (**採択**)
- ✅ 1 セッション = 1 DO instance に紐づく長期 fetch でストリーミング可能
- ✅ wrangler に container binding を宣言するだけ
- ✅ ネットワークは egress allowlist で絞れる
- ✅ CF の課金が workspace 予算と直接マップしやすい
- ⚠️ コールバックは外向き HTTP（DO の入り口） → セッションごとに短期署名
  トークンを発行して受け口を守る

## 決定

- イメージは `apps/cc-container/` で管理する（Dockerfile + entrypoint）
- API は `apps/api/src/integrations/cc/container.ts` の
  `startCcSession(db, env, task)` 経由で起動する
- `env.CC_CONTAINER` binding が undefined の dev / test は
  `sandbox-stub.ts` にフォールバックして既存挙動を維持する
- コンテナ → API のコールバックは `POST /internal/cc/event` 1 本だけ
  受け、HS256 風 HMAC で payload + 期限を検証する
  （`CC_SESSION_TOKEN_SECRET`）。受信側 route は別 PBI（既知 TODO）

## 制約とセキュリティ規約

CLAUDE.md §6 を反復する：

- **絶対に**ユーザー認証情報を mount しない
- `allowedTools` は API が決めた**明示的な allowlist**（現状 default は
  Read / Edit / Write / Bash / Grep）
- `--dangerously-skip-permissions` 禁止
- 月予算超過時は新セッション起動を API が拒否
- コンテナは 1 セッション 1 instance、終了で破棄

## 未決 / Follow-up PBI

- cc CLI のリリースチャネル / インストール手段が確定したら Dockerfile に
  install ステップを追加（現状 README に TODO）
- `POST /internal/cc/event` 受信ルートと HMAC 検証
- Egress allowlist（GitHub と SYNAPSE API への外向きだけ許可）
- prDiff 取得 → SBI への変換ロジック（既存 P3 にある cc→SBI を本物化）
- リトライ / コンテナクラッシュ時の status=failed への自動遷移
