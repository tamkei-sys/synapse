#!/usr/bin/env bash
# SYNAPSE cc sandbox entrypoint (PBI-19).
#
# Run inside the Cloudflare Container as user `cc`. Reads task config from
# environment variables (set by the API when spawning the container) and
# streams progress back to the SYNAPSE API.
#
# Required env:
#   SESSION_ID         : SYNAPSE cc_session.id
#   API_BASE           : https://api.synapse.example  (no trailing slash)
#   MCP_URL            : SYNAPSE MCP endpoint
#   MCP_TOKEN          : workspace-scoped bearer token for MCP
#   CC_SESSION_TOKEN   : short-lived token for hitting API_BASE/internal/cc/*
#   TASK_JSON          : JSON: { pbiId, prompt, allowedTools: string[] }
#
# Optional:
#   GIT_AUTHOR_NAME / GIT_AUTHOR_EMAIL : commit author for cc-generated PRs.

set -euo pipefail

: "${SESSION_ID:?SESSION_ID required}"
: "${API_BASE:?API_BASE required}"
: "${CC_SESSION_TOKEN:?CC_SESSION_TOKEN required}"
: "${TASK_JSON:?TASK_JSON required}"

post_event() {
  # $1 = event kind (started|message|ended)
  # $2 = JSON body (will be merged with kind)
  local kind="$1"
  local body="$2"
  curl -fsS -X POST \
    -H "authorization: Bearer ${CC_SESSION_TOKEN}" \
    -H "content-type: application/json" \
    -d "{\"sessionId\":\"${SESSION_ID}\",\"kind\":\"${kind}\",\"payload\":${body}}" \
    "${API_BASE}/internal/cc/event" >/dev/null || true
}

trap 'post_event "ended" "{\"status\":\"failed\",\"reason\":\"trap\"}"' ERR

# 1. SESSION_STARTED 通知。
post_event "started" "{\"image\":\"synapse/cc:scaffold\"}"

# 2. cc を実行（CLI が image に入ったら）。
# 現状はスキャフォルドなので prompt をエコーバックして 2 秒待って終わる。
PBI_ID="$(echo "${TASK_JSON}" | jq -r '.pbiId // empty')"
PROMPT="$(echo "${TASK_JSON}" | jq -r '.prompt // empty' | head -c 2000)"

post_event "message" "{\"line\":\"[scaffold] received pbi=${PBI_ID} prompt-len=${#PROMPT}\"}"
sleep 1
post_event "message" "{\"line\":\"[scaffold] cc binary not installed yet — emitting fake exit\"}"
sleep 1

# 3. 終了通知。本番では cc の exit code を見て status を決める。
# また PR を開いていれば PR URL を含める。
post_event "ended" "{\"status\":\"succeeded\",\"prUrl\":null,\"note\":\"scaffold\"}"
