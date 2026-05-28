# 0001 — Record architecture decisions

**Status:** Accepted
**Date:** 2026-05-28
**Deciders:** SYNAPSE founding team

## Context

We need a lightweight, durable way to capture the reasoning behind significant technical choices. Code answers "what"; commit messages answer "what changed"; neither answers "why" in a way that survives team turnover.

Without this, every new contributor re-litigates settled debates ("why Yjs instead of Automerge?"), and every maintainer hits a five-year-old `// HACK:` with no idea what it was working around.

## Decision

We use **Architecture Decision Records** (ADRs) following the lightweight Michael Nygard format, stored in `docs/adr/` as numbered Markdown files.

Each ADR is short (fits on one screen) and contains: **Context, Decision, Consequences, Alternatives**. ADRs are immutable once Accepted; changes happen by writing a superseding ADR.

The process is:

1. Author opens a PR with **only** the ADR file
2. Discussion happens in the PR
3. Once consensus reached, status changes to `Accepted` and PR is merged
4. Implementation PRs reference the ADR number

## Consequences

### Positive

- Decisions are searchable, durable, and explain themselves
- Reviewers can push back on choices before code lands, not after
- Onboarding gets faster — new folks read ADRs before reading code
- Disagreements get resolved through the ADR PR, not in side channels

### Negative

- Small overhead per significant decision
- Risk of ADR proliferation if applied to trivial decisions — mitigate via the "When to write" list in `README.md`
- Risk of stale ADRs if not maintained — mitigate via the `Superseded` status

## Alternatives considered

- **Wiki / Notion pages** — Rejected; they drift from code and aren't reviewed
- **Long-form comments in code** — Rejected; gets lost, doesn't capture cross-cutting decisions
- **No formal process** — Rejected; we have lived this and watched the cost compound
