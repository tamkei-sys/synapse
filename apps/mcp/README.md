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
