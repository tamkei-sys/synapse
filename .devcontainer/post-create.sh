#!/usr/bin/env bash
# Runs once after the dev container is created. Idempotent — safe to re-run.
set -euo pipefail

cd /workspace

echo "▶ corepack pnpm version: $(pnpm --version)"

echo "▶ pnpm install (workspace)"
pnpm install --frozen-lockfile=false

echo "▶ generating TanStack Router tree (so typecheck works offline)"
pnpm --filter @synapse/web routes:generate || true

# Wrangler reads secrets only from .dev.vars — populate with the same
# values exposed via docker-compose env so `wrangler dev` works out of
# the box inside the container.
if [ ! -f apps/api/.dev.vars ]; then
  echo "▶ writing apps/api/.dev.vars (dev-only values, never committed)"
  cat > apps/api/.dev.vars <<EOF
DATABASE_URL=postgres://synapse:synapse@postgres:5432/synapse_dev
BETTER_AUTH_SECRET=dev-only-not-a-real-secret-change-me
GITHUB_WEBHOOK_SECRET=dev-only-webhook-secret
EOF
fi

echo "▶ ready. Try: pnpm dev   (or)   pnpm typecheck"
