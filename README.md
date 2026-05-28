# SYNAPSE

> **Block-native workspace where docs, PBIs, spreadsheets, GitHub, and Claude Code live as one.**

SYNAPSE is an agile-first knowledge & development platform that aims to surpass Notion in three dimensions:

1. **One block model.** Pages, PBIs, spreadsheet cells, and embeds share the same `Block` primitive — so a spec doc *is* a backlog, and a backlog *is* a spreadsheet.
2. **Sub-100ms feel.** Local-first with Yjs CRDT, IndexedDB persistence, and Cloudflare edge APIs. Keystroke-to-paint under 16ms, search under 200ms.
3. **AI & dev tools as first-class citizens.** Two-way GitHub sync, headless Claude Code sessions launched from a PBI card, and an `=ASK()` spreadsheet function powered by Claude.

## Status

🚧 **Pre-MVP** — currently in design phase. See [docs/design.md](docs/design.md) for the full specification and [docs/roadmap.md](docs/roadmap.md) for the sprint plan.

## Getting started

The entire toolchain (Node 22, pnpm 11, Postgres 16 + pgvector, wrangler) lives in a dev container so it never touches your host.

### Option 1 — VS Code / Cursor

1. Install the **Dev Containers** extension and Docker (Docker Desktop, OrbStack, or Colima).
2. Open this repo and run `> Dev Containers: Reopen in Container`.
3. The container builds, `pnpm install` runs automatically, and Postgres comes up healthy.

### Option 2 — plain Docker Compose

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
docker compose -f .devcontainer/docker-compose.yml exec dev bash
# inside the container
pnpm install
pnpm typecheck
pnpm dev   # turbo runs web + api + sync concurrently
```

### Ports exposed to the host

| Service          | Host port | Container port |
| ---------------- | --------- | -------------- |
| web (Vite)       | 5173      | 5173           |
| api (Wrangler)   | 8787      | 8787           |
| sync (Hocuspocus, S3+) | 1234 | 1234           |
| postgres (pgvector) | 54322 (127.0.0.1 only) | 5432 |

The Postgres port is intentionally non-default so a host-side Postgres keeps working. Connection strings live in [`.env.example`](.env.example).

## Quick links

| Topic | Document |
|---|---|
| Full system design (v0.2) | [docs/design.md](docs/design.md) |
| 20-week roadmap | [docs/roadmap.md](docs/roadmap.md) |
| Security model | [docs/security.md](docs/security.md) |
| GitHub integration | [docs/integrations/github.md](docs/integrations/github.md) |
| Claude Code integration | [docs/integrations/claude-code.md](docs/integrations/claude-code.md) |
| Architecture decisions | [docs/adr/](docs/adr/) |
| How to contribute | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Claude Code guidance | [CLAUDE.md](CLAUDE.md) |

## Differentiation in three lines

> 1. **PBIs, docs, and spreadsheets unified through one block model.**
> 2. **Full two-way GitHub sync; one click on a PBI launches Claude Code to implement and open a PR.**
> 3. **60fps even offline. AI lives inside cells and PBIs, not as a plugin.**

## License

[MIT](LICENSE)
