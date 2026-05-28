# Contributing to SYNAPSE

Thanks for considering a contribution. SYNAPSE is in pre-MVP and we are deliberately keeping the surface area small — please read this before opening a PR.

## Before you start

1. Read [docs/design.md](docs/design.md) — it is the source of truth.
2. Check [docs/roadmap.md](docs/roadmap.md) — work outside the current sprint is unlikely to be merged.
3. Find or open an issue. **No drive-by PRs.** We will close PRs that don't link to an accepted issue.

## Development setup

> ⚠️ Pre-S1: the scaffold doesn't exist yet. These commands will be valid after Sprint 1 lands.

```bash
git clone https://github.com/<org>/synapse.git
cd synapse
nvm use                # Node 22 per .nvmrc
pnpm install
cp .env.example .env   # ask a maintainer for dev secrets
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Workflow

1. **Branch from `main`:** `feat/SYN-123-short-description` or `fix/SYN-456-...`
2. **Conventional Commits with scope:** `feat(editor): add slash menu`
3. **One logical change per PR.** Don't mix refactor + feature.
4. **Before pushing:** `pnpm lint && pnpm typecheck && pnpm test`
5. **PR description must include:**
   - `Closes #<issue>` or `Refs SYN-<id>`
   - Screenshots/GIFs for any UI change
   - Migration notes if you changed Block schema or DB
   - Tests added (or why none were needed)

## Architecture decisions

If your change involves:

- Adding a runtime dependency
- Changing the Block schema
- Modifying integration contracts (GitHub, Claude Code, MCP)
- Choosing between two non-trivial implementation paths

…then write an ADR in [docs/adr/](docs/adr/) using the [template](docs/adr/0001-record-architecture-decisions.md). Get it accepted before writing code.

## Code style

See `CLAUDE.md` §4 (Coding conventions) and §5 (Commit & PR conventions). These are enforced for humans too, not just for Claude Code.

## Security

If you discover a vulnerability, **do not** open a public issue. Email the maintainers privately. See [docs/security.md](docs/security.md) for our threat model and reporting process.

## Conduct

Be kind. Assume good intent. Critique code, not people. Reviewers: state *why*, not just *what*. Authors: receiving feedback is easier when it's about the code, so write code that's easy to discuss (small PRs, clear commits, named variables).
