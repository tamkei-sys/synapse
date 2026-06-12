# SYNAPSE VPS deployment (ADR-0013)

YOKOITO の Xserver VPS（Ubuntu 24.04 / PostgreSQL 16 / nginx）への間借りデプロイ資材。
背景と判断は [ADR-0013](../../docs/adr/0013-vps-native-deployment.md) を参照。

## 構成

```
インターネット → nginx :8081（唯一の公開ポート）
                   ├── /            … /var/www/synapse（apps/web の Vite ビルド）
                   ├── /trpc /api … 127.0.0.1:8790  synapse-api.service（Node + server.mjs）
                   ├── /healthz     … 同上
                   └── /sync (ws)   … 127.0.0.1:8791  synapse-sync.service（Hocuspocus）
PostgreSQL 16（既存クラスタに synapse_prod を追加・pgvector 有効）
Typesense 27.1（127.0.0.1:8108、公式 deb）
```

VPS 上のレイアウト:

```
/home/deploy/synapse/
├── app/           # git archive で展開されるリポジトリ
├── runtime/node/  # 専用 Node 22.22.3 + pnpm（システム Node 20 とは分離）
└── env/           # api.env / sync.env / 生成シークレット（700, 各600）
/var/www/synapse/  # 公開される web バンドル
```

## 初回セットアップ

ローカルから（コミット済みの内容だけが届く `git archive` を使う — untracked の
トークン入りスクリプト等を誤送しないため）:

```bash
ssh -i ~/.ssh/yokoito-vps deploy@<VPS_IP> 'mkdir -p /home/deploy/synapse/app'
git archive HEAD | ssh -i ~/.ssh/yokoito-vps deploy@<VPS_IP> 'tar -x -C /home/deploy/synapse/app'
ssh -i ~/.ssh/yokoito-vps deploy@<VPS_IP> 'bash /home/deploy/synapse/app/infra/vps/setup.sh http://<VPS_IP>:8081'
ssh -i ~/.ssh/yokoito-vps deploy@<VPS_IP> 'bash /home/deploy/synapse/app/infra/vps/deploy.sh'
```

シークレット（DB パスワード / BETTER_AUTH_SECRET / Typesense キー）は **VPS 上で生成され
VPS から出ない**。再実行しても既存の値を使い回す（冪等）。

## 更新デプロイ

```bash
git archive HEAD | ssh -i ~/.ssh/yokoito-vps deploy@<VPS_IP> 'tar -x -C /home/deploy/synapse/app'
ssh -i ~/.ssh/yokoito-vps deploy@<VPS_IP> 'bash /home/deploy/synapse/app/infra/vps/deploy.sh'
```

## 運用メモ

- ログ: `journalctl -u synapse-api -f` / `journalctl -u synapse-sync -f`
- 再起動: `sudo systemctl restart synapse-api synapse-sync`
- ヘルスチェック: `curl http://127.0.0.1:8081/healthz`
- Cron（リマインダー配信・ゴミ箱パージ）は server.mjs 内の setInterval が毎分実行
- GitHub webhook / OAuth / Anthropic API は未設定（env を足せば有効化される）
- 間借りの掟: 既存テナント（YOKOITO 本番 :3000 / staging :3001 / WordPress :80,:443,:8080）
  と、システム Node 20・既存 nginx site・既存 DB には**触れない**

## 撤収手順（全て synapse 名前空間に閉じている）

```bash
sudo systemctl disable --now synapse-api synapse-sync
sudo rm /etc/systemd/system/synapse-{api,sync}.service /etc/nginx/sites-{enabled,available}/synapse
sudo systemctl daemon-reload && sudo systemctl reload nginx
sudo apt-get remove typesense-server   # 他に使い手がいない場合のみ
sudo -u postgres dropdb synapse_prod && sudo -u postgres dropuser synapse
rm -rf /home/deploy/synapse /var/www/synapse
```
