#!/usr/bin/env bash
# SYNAPSE VPS deploy (ADR-0013). Run ON the VPS as `deploy`, after setup.sh:
#
#   bash /home/deploy/synapse/app/infra/vps/deploy.sh
#
# Installs deps, builds api/sync/web, runs Drizzle migrations, publishes the
# web bundle and restarts both services.
set -euo pipefail

BASE=/home/deploy/synapse
APP="$BASE/app"
export PATH="$BASE/runtime/node/bin:$PATH"

cd "$APP"

# Build/migrate-time env: DATABASE_URL for drizzle-kit, VITE_* for the web
# bundle (turbo.json lists them in globalEnv so they reach vite and key the
# build cache).
set -a
# shellcheck disable=SC1091
source "$BASE/env/api.env"
set +a

echo "==> pnpm install"
pnpm install --frozen-lockfile

echo "==> Building api / sync / web / mcp"
pnpm exec turbo run build \
  --filter=@synapse/api --filter=@synapse/sync --filter=@synapse/web --filter=@synapse/mcp

echo "==> Running DB migrations"
pnpm --filter @synapse/schema db:migrate

echo "==> Publishing web bundle"
rsync -a --delete apps/web/dist/ /var/www/synapse/

echo "==> Restarting services"
sudo systemctl restart synapse-api synapse-sync

echo "==> Deployed at $(date -Is)"
