# @synapse/mcp

SYNAPSE Model Context Protocol server — exposes PBI read/write tools to Claude Code (and any other MCP-compatible agent) over stdio.

> Sprint 6 deliverable. The four tools below cover the S6 DoD ("cc can read/write PBIs from terminal"). More land in S7+ (spreadsheets) and S9 (headless cc launches).

## Tools

| Name | Effect | Notes |
| --- | --- | --- |
| `synapse_list_pbis` | read | Optional `status` filter (`backlog` / `ready` / `in_progress` / `review` / `done`) |
| `synapse_get_pbi` | read | Required: `pbiId` |
| `synapse_create_pbi` | **write** | Required: `title`. Optional: `status`, `storyPoints` |
| `synapse_update_pbi_status` | **write** (destructive) | Required: `pbiId`, `status`. cc should confirm with the user |

Every tool call is recorded in the workspace's `audit_log` table — the row carries the actor user, the token id, the tool name, a JSON-safe argument preview, and the outcome.

## Wiring it up in Claude Code

> **Dev-stack shortcut:** on the host, `node apps/mcp/scripts/setup-local-mcp.mjs`
> does all of the below in one shot — it issues a token against the local dev DB
> and writes a gitignored `.mcp.json` at the repo root, including the doc body
> variables from the next section. To generate a config for a cc running
> *inside* the dev container instead, run it in the container (auto-detected) or
> pass `--container`.

1. Open the SYNAPSE web app and head to **API tokens** (`/settings/tokens`).
2. Create a new token. Copy it immediately — it's shown exactly once.
3. Point Claude Code at this server. In your `~/.claude/mcp_settings.json` (or the cc config UI):

```json
{
  "mcpServers": {
    "synapse": {
      "command": "node",
      "args": ["/abs/path/to/synapse/apps/mcp/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgres://synapse:synapse@127.0.0.1:54322/synapse_dev",
        "SYNAPSE_API_TOKEN": "synapse_paste_the_token_here"
      }
    }
  }
}
```

4. Restart cc. You'll see `synapse_*` tools appear in the picker.

## Enabling the doc body tools (`synapse_set_doc` / `synapse_append_doc`)

The two body-editing tools don't write the database directly — they POST to the
sync server's internal doc-write API
([ADR-0011](../../docs/adr/0011-mcp-doc-body-write.md)), which applies the
change to the live Yjs document. That API is reached via two extra env vars on
the **MCP server process**. While they're unset, only these two tools fail
(with a clear "not configured" error); everything else keeps working.

`apps/mcp/scripts/setup-local-mcp.mjs` emits both variables into the repo-root
`.mcp.json` automatically: it copies the secret out of the compose file at
generation time (never printing it) and picks the URL for the target
environment — `http://127.0.0.1:1235` for a host-side server,
`http://localhost:1235` for one inside the dev container (auto-detected, or
force with `--host` / `--container`). The rest of this section is for wiring
any other MCP client by hand.

| Env var | Value for the dev-container setup |
| --- | --- |
| `SYNC_INTERNAL_URL` | `http://127.0.0.1:1235` when the MCP server runs on the host; `http://localhost:1235` when it runs inside the dev container |
| `SYNC_INTERNAL_SECRET` | The value of `services.dev.environment.SYNC_INTERNAL_SECRET` in [.devcontainer/docker-compose.yml](../../.devcontainer/docker-compose.yml) — copy it from there; don't paste it into docs, commits, or logs |

A host-side MCP config (Claude desktop app or Claude Code spawning
`node .../apps/mcp/dist/index.js`) therefore gets this `env` block:

```json
"env": {
  "DATABASE_URL": "postgres://synapse:synapse@127.0.0.1:54322/synapse_dev",
  "SYNAPSE_API_TOKEN": "synapse_paste_the_token_here",
  "SYNC_INTERNAL_URL": "http://127.0.0.1:1235",
  "SYNC_INTERNAL_SECRET": "<copy from .devcontainer/docker-compose.yml>"
}
```

Restart the MCP client afterwards — env changes only apply when it respawns the
server process.

### How port 1235 reaches the host

`apps/sync` starts the internal API on container port `1235` whenever its own
`SYNC_INTERNAL_SECRET` is set (the dev compose file sets it for the `dev`
service). The compose file maps that port to the host as `127.0.0.1:1235:1235`
— **loopback-only by design**: ADR-0011 requires that the endpoint is never
reachable from other machines. Don't widen the mapping to `0.0.0.0` or put it
behind a proxy.

Troubleshooting, in dependency order:

1. **Tools report "not configured"** — the MCP server process is missing one of
   the two env vars. Fix the client's MCP config (for the repo-root `.mcp.json`,
   just rerun `node apps/mcp/scripts/setup-local-mcp.mjs`) and restart the
   client.
2. **Connection refused on `127.0.0.1:1235`** — the running container predates
   the port mapping (mappings only apply at container creation). Recreate it
   with `docker compose -f .devcontainer/docker-compose.yml up -d dev` (or
   **Rebuild Container** in VS Code), then start the dev stack again
   (`pnpm dev` inside the container).
3. **Probe without touching any secret** —
   `curl -i http://127.0.0.1:1235/` should return `404 {"error":"not found"}`;
   that proves the mapping and the listener. A `401 {"error":"unauthorized"}`
   on a real `POST /internal/doc/write` means the secret in your MCP config
   doesn't match the one in the compose file.

## Security model

The server fails closed:

- Refuses to start if `SYNAPSE_API_TOKEN` is missing.
- Refuses to start if the token is unknown / revoked / expired (resolved against the `api_token` table on boot).
- Every tool dispatch checks that the target row belongs to the token's workspace before reading or mutating.
- Plaintext tokens are never logged. Only the SHA-256 hash and the trailing 8 chars (`suffix`) are persisted.
- Stdout is reserved for the MCP JSON-RPC channel; diagnostics go to stderr.

See [docs/security.md](../../docs/security.md) for the full model.

## Local development

```bash
# from the workspace root (inside the dev container):
DATABASE_URL=postgres://synapse:synapse@postgres:5432/synapse_dev \
SYNAPSE_API_TOKEN=synapse_xxxx \
  pnpm --filter @synapse/mcp dev
```

`dev` runs `tsx watch src/index.ts`. Since stdin is the MCP channel, the easiest way to poke at it interactively is from cc itself — but running the server alone is useful for catching boot-time errors.
