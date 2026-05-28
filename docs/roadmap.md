# SYNAPSE Roadmap

**10 sprints × 2 weeks = 20 weeks to full vision.**
MVP with first-mover differentiation lands at S6.

## Sprint plan

| Sprint | Weeks | Deliverable | Definition of done |
|---|---|---|---|
| **S1** | 1–2 | Auth + workspace + basic Block CRUD | Can sign in and create a page |
| **S2** | 3–4 | TipTap integration + slash commands | Document editing works |
| **S3** | 5–6 | Yjs sync + offline support | Two tabs co-edit without conflict |
| **S4** | 7–8 | PBI module (Backlog + Kanban) | `/pbi` in doc → card on board |
| **S5** | 9–10 | GitHub App + Issue/PR two-way sync | PBI ↔ Issue auto-synced |
| **S6** | 11–12 | SYNAPSE MCP Server (Layer 1) | cc can read/write PBIs from terminal |
| **S7** | 13–14 | Spreadsheet (AG Grid + HyperFormula) | Embeddable in docs; `=SUM` works |
| **S8** | 15–16 | Search (Typesense) + `=ASK()` AI cells | Cmd+K full-text; AI formula works |
| **S9** | 17–18 | Headless cc launch (Layers 2 + 3) | "Implement" button → PR opened |
| **S10** | 19–20 | CI integration + embed widgets | Live PR diff in docs, CI badges on cards |

## Milestones

| Milestone | Sprint | Why it matters |
|---|---|---|
| **Internal alpha** | end of S3 | We can use it ourselves for note-taking |
| **Dogfood** | end of S4 | We can manage SYNAPSE's own backlog in SYNAPSE |
| **First public differentiation** | end of S6 | MCP Server is something no competitor has |
| **MVP launch** | end of S8 | Spreadsheet + AI cells = a story we can sell |
| **Full v1** | end of S10 | The complete vision from design.md |

## Out of scope for v1

These are deliberately deferred — strong feature-creep candidates we must resist:

- Mobile apps (web is mobile-responsive; native is post-v1)
- Plugins / extension API
- Self-hosted distribution
- Whiteboard / canvas / Figma-style spatial UI
- Voice & video
- Calendar / scheduling
- Notion import (post-v1; we'll need it but not for launch)
- Slack / Discord / Linear integrations (only GH for v1)
- Public sharing / publish-as-website
- Multi-language UI (English-only at launch)

## Non-goals (we will never do)

- Compete with Notion on database flexibility — our DB *is* the Block model
- Build our own AI model — we use Anthropic
- Build our own CRDT — we use Yjs
- Build our own formula engine — we use HyperFormula
- Build our own search — we use Typesense
