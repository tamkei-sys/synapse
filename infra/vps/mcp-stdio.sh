#!/usr/bin/env bash
# SYNAPSE MCP server entry for SSH-stdio clients (ADR-0013).
#
# A local Claude Code config spawns this over SSH — MCP speaks JSON-RPC on
# stdio, which pipes through SSH unchanged:
#
#   { "command": "ssh",
#     "args": ["-i", "~/.ssh/yokoito-vps", "-o", "BatchMode=yes",
#              "deploy@<VPS_IP>", "bash",
#              "/home/deploy/synapse/app/infra/vps/mcp-stdio.sh"] }
#
# Credentials come from /home/deploy/synapse/env/mcp.env, written by
# infra/vps/issue-mcp-token.mjs. Nothing is read from the client side, and the
# database stays loopback-only on the VPS.
set -euo pipefail

BASE=/home/deploy/synapse

if [ ! -f "$BASE/env/mcp.env" ]; then
  echo "mcp.env not found — run infra/vps/issue-mcp-token.mjs first" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source "$BASE/env/mcp.env"
set +a

exec "$BASE/runtime/node/bin/node" "$BASE/app/apps/mcp/dist/index.js"
