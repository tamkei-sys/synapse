# SYNAPSE

> **Block-native workspace where docs, PBIs, spreadsheets, GitHub, and Claude Code live as one.**

SYNAPSE is an agile-first knowledge & development platform that aims to surpass Notion in three dimensions:

1. **One block model.** Pages, PBIs, spreadsheet cells, and embeds share the same `Block` primitive — so a spec doc *is* a backlog, and a backlog *is* a spreadsheet.
2. **Sub-100ms feel.** Local-first with Yjs CRDT, IndexedDB persistence, and Cloudflare edge APIs. Keystroke-to-paint under 16ms, search under 200ms.
3. **AI & dev tools as first-class citizens.** Two-way GitHub sync, headless Claude Code sessions launched from a PBI card, and an `=ASK()` spreadsheet function powered by Claude.

## Status

🚧 **Pre-MVP** — currently in design phase. See [docs/design.md](docs/design.md) for the full specification and [docs/roadmap.md](docs/roadmap.md) for the sprint plan.

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
