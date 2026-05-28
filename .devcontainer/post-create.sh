#!/usr/bin/env bash
# Runs once after the dev container is created. Idempotent — safe to re-run.
set -euo pipefail

cd /workspace

echo "▶ corepack pnpm version: $(pnpm --version)"

echo "▶ pnpm install (workspace)"
pnpm install --frozen-lockfile=false

echo "▶ generating TanStack Router tree (so typecheck works offline)"
pnpm --filter @synapse/web routes:generate || true

echo "▶ ready. Try: pnpm dev   (or)   pnpm typecheck"
