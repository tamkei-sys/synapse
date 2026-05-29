# synapse/cc-container

Cloudflare Container image that runs **headless Claude Code (`cc`)** for a
single SYNAPSE session, attached to the SYNAPSE MCP server. PBI-19 scope.

This is the **scaffold** — the Dockerfile + entrypoint encode the contract
between SYNAPSE API and the cc runtime. The actual cc CLI install is
deferred until release/license details are settled.

## Build

```bash
docker build -t synapse-cc:dev apps/cc-container
```

## Local smoke test (no cc binary required)

```bash
docker run --rm \
  -e SESSION_ID=demo \
  -e API_BASE=http://host.docker.internal:8787 \
  -e CC_SESSION_TOKEN=demo-token \
  -e TASK_JSON='{"pbiId":"PBI-1","prompt":"hello","allowedTools":["Read","Edit"]}' \
  synapse-cc:dev
```

The entrypoint POSTs `started → message → ended` to
`POST $API_BASE/internal/cc/event` (Bearer token).

## Production deployment (Cloudflare Containers)

```toml
# apps/api/wrangler.toml の抜粋
[[containers]]
class_name = "CcContainer"
image      = "synapse-cc"
max_instances = 5  # workspace x parallel cap

[durable_objects]
bindings = [
  { name = "CC_CONTAINER", class_name = "CcContainer" },
]
```

API 側は `env.CC_CONTAINER.idFromName(sessionId).fetch(...)` で起動する
（`apps/api/src/integrations/cc/container.ts` を参照）。

## Security checklist (CLAUDE.md §6)

- ❌ Never mount `~/.aws/`, `~/.ssh/`, `~/.gcloud/`, `~/.kube/`,
  `~/.docker/config.json`
- ❌ Never pass `--dangerously-skip-permissions`
- ✅ `allowedTools` is an explicit allowlist coming from API via TASK_JSON
- ✅ `CC_SESSION_TOKEN` is short-lived (≤ 30 min) workspace-scoped
- ✅ Budget cap is enforced by API **before** the container spawns
- ✅ Container exits and is destroyed after each session (no state reuse)

## TODO

- [ ] cc CLI 公開後にバイナリ install を追加
- [ ] PR URL を cc 出力からパースして event.ended に含める
- [ ] dind を回避して GitHub への push を OAuth token で限定
- [ ] CF Containers の class_name / max_instances を本番で確定
