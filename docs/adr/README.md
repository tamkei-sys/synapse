# Architecture Decision Records (ADRs)

This directory captures **why** we chose what we chose. Code shows *what*; ADRs show *why*. Together they let a new contributor (or a future maintainer) recover the reasoning behind the design.

## When to write an ADR

Write one **before** the change lands when you are:

- Adding a runtime dependency (anything that ships in production)
- Changing the Block schema in `packages/blocks/`
- Modifying an integration contract (GitHub, Claude Code, MCP)
- Choosing between two non-trivial implementation paths
- Introducing a new architectural pattern
- Deprecating something other code depends on

Skip it for:

- Internal refactors with no external impact
- Bug fixes
- Pure additions (a new pure function, a new private helper)

## How to write one

1. Copy [0001-record-architecture-decisions.md](0001-record-architecture-decisions.md) and rename to the next number + a kebab title (`0002-use-yjs-for-crdt.md`)
2. Fill out the sections — keep each one short. The whole ADR should fit on one screen.
3. Open a PR with **only** the ADR — get it accepted before the implementation PR
4. Once accepted, update its status to `Accepted` and merge

## Status values

- **Proposed** — being discussed in a PR
- **Accepted** — agreed, in effect
- **Superseded by NNNN** — replaced by a newer ADR (link it)
- **Deprecated** — no longer relevant but kept for history

Never edit an Accepted ADR in place to change the decision — write a new ADR that supersedes it.

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
