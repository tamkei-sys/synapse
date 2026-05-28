# Project SYNAPSE — System Design v0.2

> Block-native workspace combining Docs, PBIs, Spreadsheets, GitHub, and Claude Code into one unified surface.

**Status:** Design phase (pre-MVP)
**Last updated:** 2026-05-28
**Authors:** SYNAPSE founding team

---

## 1. Mission

> A workspace where **writing, planning, and computing** share one block model, and where **GitHub** and **Claude Code** are first-class citizens — not bolt-ons.

### Why this matters

- Notion is loved for its flexibility but hated for its weight, weak search, and weak spreadsheet
- Linear is loved for speed and dev-tool integration but its docs are an afterthought
- Confluence is the past

The right-upper quadrant (strong docs **and** strong dev integration) is **open**. SYNAPSE goes there.

---

## 2. Core value pillars

| # | Pillar | Goal | Vs. Notion |
|---|---|---|---|
| 1 | **Block-Native PBI** | Stories / epics / sprints expressed as pure Blocks | Notion DBs are heavy and lack a dedicated UI |
| 2 | **Doc-First Knowledge** | Rich editor, bidirectional links, graph view, full-text + semantic search | Combines the strengths of Obsidian + Notion + Roam |
| 3 | **Embedded Spreadsheet** | Excel-grade cells, formulas, pivots — inside any doc | Notion DBs are weak at cell formulas |
| 4 | **Sub-100ms Feel** | 60fps keystroke → paint, search < 200ms | The #1 Notion complaint, solved |

---

## 3. Personas & top user stories

We design for three personas — **only** three.

- **PM (Product Manager):** Reviews sprint board → triages backlog → writes spec doc → uses spreadsheet to estimate
- **Engineer:** Looks at their lane → starts work → links PR → daily stand-up summary auto-generated
- **Tech Lead:** Writes a design doc and a cost-of-work table in the same page — and triggers Claude Code from the page when ready

---

## 4. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Web / Desktop)                 │
│  React 19 + TanStack Router + Zustand + TipTap + AG Grid    │
│  ─ Local-first Cache (IndexedDB + Yjs CRDT)                 │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket (Yjs sync) + REST/tRPC
┌────────────────────────▼────────────────────────────────────┐
│                      Edge / API Layer                       │
│            Hono on Cloudflare Workers (or Bun)              │
│  ─ Auth (Better-Auth)  ─ Rate Limit  ─ tRPC Gateway         │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼─────────────────┐
        ▼                ▼                 ▼
┌──────────────┐ ┌──────────────┐  ┌──────────────────┐
│ Block Store  │ │ Search Index │  │ Realtime / CRDT  │
│ PostgreSQL   │ │ Typesense    │  │ y-websocket /    │
│ + pgvector   │ │ / Meilisearch│  │ Hocuspocus       │
└──────────────┘ └──────────────┘  └──────────────────┘
        │                                  │
        ▼                                  ▼
┌──────────────┐                  ┌──────────────────┐
│ Object Store │                  │ AI Layer         │
│ S3 / R2      │                  │ Claude API       │
│ (assets)     │                  │ (summarize/      │
│              │                  │  complete/search)│
└──────────────┘                  └──────────────────┘
```

**Pattern:** CQRS. Writes via CRDT (local-first, optimistic). Reads via the normalized Postgres projection. Search via an inverted index (Typesense) and vector index (pgvector) joined at query time.

---

## 5. Core data model — the Block primitive

Everything is a Block. Pages, PBIs, spreadsheet cells, paragraphs.

```ts
type Block = {
  id: string;              // ULID
  workspaceId: string;
  parentId: string | null;
  type: BlockType;         // 'page' | 'paragraph' | 'heading' | 'pbi'
                           // | 'sprint' | 'epic' | 'sheet' | 'sheet_cell'
                           // | 'table_row' | 'embed' | 'code' | ...
  position: string;        // Fractional Indexing (LexoRank-style)
  props: Record<string, unknown>;  // schema per type
  content: Block[];        // children, computed via query
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;         // optimistic concurrency
  deletedAt: Date | null;  // soft delete
};

// Example: PBI props
type PBIProps = {
  title: string;
  status: 'backlog' | 'ready' | 'in_progress' | 'review' | 'done';
  storyPoints: number;
  assigneeIds: string[];
  sprintId: string | null;
  epicId: string | null;
  acceptanceCriteria: Block[]; // nested checklist
  linkedDocs: string[];
  linkedPRs: { provider: 'github'; url: string }[];

  // Integration fields (see §10, §11)
  github?: GitHubLinkProps;
  claudeCode?: ClaudeCodeSessionProps;
};

// Example: spreadsheet cell props
type SheetCellProps = {
  row: number;
  col: number;
  raw: string;          // user input as-is
  formula?: string;     // "=SUM(A1:A10)"
  computed?: unknown;   // evaluated value
  format?: CellFormat;
};
```

The Block schema lives in `packages/blocks/` and is the single source of truth. tRPC contracts and DB rows derive from it via Zod + Drizzle.

---

## 6. PBI / agile module

### 6.1 Four views

| View | Use | Implementation |
|---|---|---|
| **Backlog** | Vertical list, drag-to-reorder priority | Virtual list + dnd-kit |
| **Sprint Board** | Kanban, WIP limits, swim lanes | dnd-kit + optimistic UI |
| **Timeline / Gantt** | Epic-level overview with dependencies | Canvas/SVG hybrid |
| **Burndown** | Remaining points per sprint | Recharts |

### 6.2 Why the block model wins here

Type `/pbi` inside a spec doc:

```markdown
# Auth feature design
Users should sign in with Google.

/pbi Implement Google sign-in button   [3pt] @shinji
/pbi Token refresh handling             [5pt] @rei
/pbi Sign-in state tests                [2pt] @asuka
```

Each line *is* a PBI block. It renders inline in the doc **and** appears on the Sprint Board. Edit it in either place; both update.

---

## 7. Document management (beyond Notion)

Required minimum to surpass Notion:

```
✓ Block editor (TipTap / ProseMirror)
✓ Slash commands (/heading, /pbi, /sheet, /ai, ...)
✓ Bidirectional links ([[Page]] syntax, backlink panel)
✓ Graph view (Obsidian-style, Cytoscape.js)
✓ Full-text + semantic search (Typesense + pgvector hybrid)
✓ Offline editing (Yjs CRDT + IndexedDB persistence)
✓ Version history with timeline slider (free tier from day one)
```

---

## 8. In-document spreadsheet

The #1 differentiator. Notion's table is a database, not a spreadsheet — we ship both.

```
Recommended stack:
┌─────────────────────────────────────────┐
│ Display & edit  : AG Grid Community     │
│ Formula engine  : HyperFormula (380+)   │
│ Sync            : Yjs Awareness + Y.Map │
│ Persistence     : sheet_cell Blocks     │
└─────────────────────────────────────────┘
```

### 8.1 Spreadsheet features

- VLOOKUP / SUMIFS / array formulas
- Pivot tables
- Conditional formatting
- Charts (Recharts embed)
- **Cross-document references:** `={DocName}!A1` — a feature Notion lacks
- **AI cell function:** `=ASK("summarize this column", A1:A20)` — Claude API as a formula

`=ASK()` makes Claude part of the computation graph, not a sidebar widget. This is unique.

---

## 9. UI / UX principles

Measurable goals — "operability" is not a vibe.

| Metric | Target | Measure |
|---|---|---|
| Initial TTI | < 1.5s | Lighthouse |
| Keystroke → paint | < 16ms (60fps) | RUM (Performance API) |
| Page switch | < 100ms | TanStack Router prefetch |
| Search result | < 200ms (p95) | Typesense |
| Offline → online sync | < 3s for 1000 ops | Yjs benchmark |

### 9.1 Design principles

```
1. Keyboard-first        — Cmd+K command palette reaches every action
2. Command-palette-central — Linear/Raycast school, deep menus are banned
3. Progressive disclosure  — Simple for new users, all-features for power users
4. Dark mode first-class   — Semantic tokens only, never hardcoded grays
5. Restrained motion       — No animation > 300ms; tab switches are instant
6. Accessibility           — WCAG AA, focus ring always visible
```

---

## 10. GitHub integration

### 10.1 Feature matrix

| Feature | Direction | Trigger | Behavior |
|---|---|---|---|
| **PBI → Issue create** | SYN → GH | PBI moves to `ready` | Create GH Issue, store its ID |
| **PBI ↔ Issue two-way sync** | both | either updates | Sync title / body / labels / assignees |
| **PBI → Branch create** | SYN → GH | Button click | Branch `pbi/{id}-{slug}` |
| **PR ↔ PBI auto-link** | GH → SYN | PR contains `SYN-123` | Add PR card to PBI |
| **CI status display** | GH → SYN | Workflow webhook | Badge on kanban card |
| **PR merge → PBI done** | GH → SYN | PR merged | Status to `done`, record points |
| **Code snippet embed** | GH → SYN | `/embed-code` in doc | Live-rendered permalink |
| **Issue import** | GH → SYN | Initial setup | Bulk-convert Issues to PBIs |

### 10.2 Auth: GitHub App (not OAuth App)

```
✓ Per-repo permission granularity
✓ Higher rate limit (5,000 → 15,000/hour)
✓ Installed on the org, not individuals
✓ Stable webhook subscriptions
✓ Clear bot user as commit author
```

### 10.3 Webhook intake pipeline

```ts
// apps/api/src/integrations/github/webhook.ts
app.post('/webhooks/github', async (c) => {
  // 1. Signature verification (X-Hub-Signature-256)
  const verified = await verifyGitHubSignature(c.req);
  if (!verified) return c.json({ error: 'invalid signature' }, 401);

  // 2. Replay protection (delivery ID in KV)
  const deliveryId = c.req.header('x-github-delivery');
  if (await kv.get(`gh:delivery:${deliveryId}`)) return c.json({ ok: true });
  await kv.set(`gh:delivery:${deliveryId}`, '1', { ex: 86400 });

  // 3. Normalize and enqueue (return fast)
  const event = await normalizeGitHubEvent(c.req);
  await c.env.SYNAPSE_EVENTS.send(event);
  return c.json({ ok: true });
});

// Queue consumer (separate worker)
export default {
  async queue(batch: MessageBatch<SynapseEvent>) {
    for (const msg of batch.messages) {
      await applyEventToBlocks(msg.body);
      msg.ack();
    }
  },
};
```

### 10.4 Two-way conflict resolution

```
Scenario: PBI title and Issue title edited concurrently.

Each object stores `lastSyncedAt`.
On sync: if `updatedAt > lastSyncedAt`, that side has changes.
Both sides changed → conflict UI [GH wins | SYN wins].

Default policy: most-recently-updated wins,
but field-level merge is attempted first:
  title    → newer wins
  body     → newer wins (diff shown)
  labels   → union
  assignee → newer wins
```

---

## 11. Claude Code integration

The core differentiator vs. every PM tool on the market.

### 11.1 Four layers

```
Layer 1: SYNAPSE MCP Server
  → cc can read/write PBIs & Docs from the user's terminal
Layer 2: Headless cc launch (Claude Agent SDK)
  → "Implement with Claude Code" button on PBI cards
Layer 3: Session transcripts saved as Docs
  → Why this AI did what is auditable & searchable
Layer 4: Team Skill sync
  → Shared ~/.claude/skills/ for the whole team
```

### 11.2 Layer 1 — SYNAPSE MCP Server

```ts
// apps/mcp/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server';

const server = new McpServer({ name: 'synapse', version: '0.1.0' });

server.tool(
  'synapse_search_pbi',
  'Search PBIs by status, sprint, assignee, or keyword',
  z.object({
    query: z.string().optional(),
    status: z.enum(['backlog', 'ready', 'in_progress', 'review', 'done']).optional(),
    sprintId: z.string().optional(),
    limit: z.number().default(20),
  }),
  async (args, ctx) => searchPBIs(args, ctx.auth),
);

server.tool('synapse_get_pbi', '...', { id: z.string() }, async (a) => getPBI(a.id));
server.tool('synapse_update_pbi_status', '...', /* ... */ );
server.tool('synapse_append_doc', '...', /* ... */ );
server.tool('synapse_search_docs', '...', /* ... */ );
```

User installs it once:

```bash
claude mcp add synapse \
  --transport http \
  --url https://api.synapse.app/mcp \
  --header "Authorization: Bearer $SYNAPSE_TOKEN"
```

Then from any terminal:

> *"Show me unstarted PBIs assigned to me in the current sprint."*

cc calls `synapse_search_pbi`, returns the list, and the user picks one.

### 11.3 Layer 2 — Headless cc launch from the UI

Click `⚡ Implement with Claude Code` on a PBI:

```
SYNAPSE composes:
  - PBI body + acceptance criteria
  - Linked docs (specs)
  - Related PBIs (dependencies)
  - Target GitHub repo
  - Suggested branch: pbi/syn-145-auth-test

SYNAPSE launches headless cc (Claude Agent SDK):
  ┌────────────────────────────────────────┐
  │ const result = await query({           │
  │   prompt: pbiPrompt,                   │
  │   options: {                           │
  │     cwd: clonedRepoInSandbox,          │
  │     allowedTools: ['Bash','Edit',      │
  │                    'Read','Write'],    │
  │     mcpServers: { synapse: {...} },    │
  │     model: 'claude-opus-4-7',          │
  │   },                                   │
  │ });                                    │
  └────────────────────────────────────────┘

Execution: Cloudflare Container (sandboxed)
  - Repo cloned inside
  - Output streamed back via WebSocket
  - On success: PR opened, linked to the PBI
```

**Sandbox is mandatory.** No user credentials. No `--dangerously-skip-permissions`. Server-side enforcement.

### 11.4 Layer 3 — Session transcript → Doc

When the cc session ends, save the transcript as a SYNAPSE doc:

```
📄 SYN-145 Implementation session (2026-05-28 14:30)
├─ Summary: Added 5 Vitest tests for auth flow
├─ Files edited:
│   - apps/api/src/auth/auth.test.ts (+183 -0)
│   - apps/api/src/auth/auth.service.ts (+12 -3)
├─ Commands run: pnpm test:auth (passed)
├─ Decisions log:
│   1. Investigated existing test patterns
│   2. Chose msw for mocking
│   3. Considered 3 edge cases
└─ PR: github.com/org/repo/pull/487
```

Knowledge of *why* is preserved, searchable, and replayable.

### 11.5 Layer 4 — Team Skills

Team-authored Skills in SYNAPSE sync to each member's `~/.claude/skills/team-{name}/SKILL.md`. The team agrees on review rubrics, glossary, release process, etc., once — all cc instances pick it up.

---

## 12. Data model extension for integrations

```ts
type PBIProps = {
  // ... existing fields ...

  github?: {
    issueNumber?: number;
    issueUrl?: string;
    pullRequests: Array<{
      number: number;
      url: string;
      state: 'open' | 'closed' | 'merged';
      ciStatus: 'pending' | 'success' | 'failure' | null;
      lastSyncedAt: Date;
    }>;
    branch?: string;
    lastSyncedAt?: Date;
  };

  claudeCode?: {
    sessions: Array<{
      sessionId: string;
      startedAt: Date;
      endedAt?: Date;
      status: 'running' | 'completed' | 'failed' | 'cancelled';
      docId?: string;
      tokensUsed?: number;
      cost?: number;
    }>;
  };
};

type WorkspaceIntegrations = {
  github?: {
    installationId: number;
    repos: Array<{ owner: string; name: string; defaultBranch: string }>;
    syncMode: 'manual' | 'auto';
  };
  claudeCode?: {
    enabled: boolean;
    sandboxRegion: 'iad' | 'nrt' | 'fra';
    monthlyBudgetUsd: number;
    allowedModels: ('claude-opus-4-7' | 'claude-sonnet-4-6')[];
  };
};
```

---

## 13. UI placements for integrations

| Where | Element | Description |
|---|---|---|
| PBI card top-right | GH badge | Issue # + PR state color |
| PBI card top-right | ⚡ icon | Launch cc session |
| Sprint Board | CI strip | Color band on each card |
| Doc editor | `/embed-pr` | Live PR diff |
| Doc editor | `/embed-code` | Live GH file/lines |
| Cmd+K palette | `gh:open SYN-145` | Jump to related Issue/PR |
| Cmd+K palette | `cc:run SYN-145` | Start cc session inline |
| Sidebar | 🤖 cc Sessions | Active & recent sessions |
| Settings | Integrations tab | GH App auth, cc budget |

---

## 14. Technology choices (MAGI verdict)

```
━━━━━ MAGI judgment: Frontend ━━━━━
MELCHIOR-1  : Approved — React 19 + TanStack + TipTap most mature
BALTHASAR-2 : Approved — Largest ecosystem and longevity
CASPER-3    : Approved — Largest hiring market
Result: 3-0 approved

━━━━━ MAGI judgment: Backend ━━━━━
MELCHIOR-1  : Approved — Hono + tRPC + Postgres balances perf & type-safety
BALTHASAR-2 : Pending — CF Workers weak for long-running work; isolate AI to separate worker
CASPER-3    : Approved — Bun on Fly.io also works; swappable
Result: 2-1 approved (heavy work must live in separate worker/container)

━━━━━ MAGI judgment: Realtime ━━━━━
MELCHIOR-1  : Approved — Yjs is best-in-class CRDT
BALTHASAR-2 : Approved — Hocuspocus lowers ops burden; Notion uses similar
CASPER-3    : Approved — Excellent offline behavior, works in practice
Result: 3-0 approved
```

### 14.1 Final stack

```
Frontend
├─ React 19 + TypeScript
├─ TanStack Router (file-based, type-safe)
├─ TanStack Query (server state)
├─ Zustand (client state)
├─ TipTap (ProseMirror) — doc editor
├─ AG Grid Community + HyperFormula — spreadsheet
├─ dnd-kit — kanban / backlog DnD
├─ Tailwind CSS v4 + Radix UI primitives
├─ Yjs + IndexedDB — local-first sync
└─ Vite + Vitest + Playwright

Backend
├─ Hono on Cloudflare Workers (edge API)
├─ tRPC v11 (typed RPC)
├─ Better-Auth (email + Google + GitHub)
├─ Drizzle ORM
├─ PostgreSQL 16 + pgvector (Neon or Supabase)
├─ Typesense (search)
├─ Hocuspocus (Yjs websocket; separate container)
├─ Cloudflare R2 (assets)
└─ Claude API (claude-opus-4-7 / claude-sonnet-4-6)

DevOps
├─ Turborepo monorepo
├─ GitHub Actions CI
├─ Cloudflare Pages (frontend)
├─ Sentry + PostHog
└─ Playwright E2E
```

---

## 15. Repository layout

```
synapse/
├── apps/
│   ├── web/                # React SPA
│   ├── api/                # Hono + tRPC on Cloudflare Workers
│   ├── sync/               # Hocuspocus (separate container)
│   └── mcp/                # SYNAPSE MCP Server
├── packages/
│   ├── schema/             # Zod + Drizzle shared schema
│   ├── blocks/             # Block type definitions & converters
│   ├── formula/            # HyperFormula extensions (=ASK, etc.)
│   └── ui/                 # Shared components
└── docs/
```

---

## 16. Roadmap

See [roadmap.md](roadmap.md). Summary: 10 sprints × 2 weeks each. MVP-with-differentiation lands at S6 (after MCP Server). Full vision lands at S10.

---

## 17. Security

See [security.md](security.md). Highlights: webhook HMAC verification, Claude Code sandbox isolation, MCP token rotation, prompt-injection defense for external content.

---

## 18. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| CRDT implementation complexity | High | Use Yjs off-the-shelf; never roll our own |
| Spreadsheet formula engine | High | Adopt HyperFormula; do not build custom |
| Performance regression | Medium | Mandatory virtual lists; perf metrics in CI |
| Feature war with Notion | Medium | Differentiate, do not compete feature-for-feature |
| Anthropic API cost blowup | Medium | Prompt caching mandatory + per-workspace budget cap |
| Offline sync inconsistency | High | E2E Yjs scenarios on every PR |
| Scope creep | High | Strict S1–S10 gate, no additions mid-sprint |
| GH webhook reordering | Medium | `deliveryId` dedup + last-write-wins per field |
| GH API rate limit | Medium | Conditional requests with ETag |
| Prompt injection | High | Treat external content as `<external-data>` only |
| Sandbox escape | High | Cloudflare Container isolation |
| Team Skill sync abuse | Medium | Git-push model + signature verification |
| Long-hanging cc sessions | Medium | 10-min timeout, resource release on signal |
| MCP token leakage | High | Short-lived + rotation + audit log |

---

## 19. Competitive map

```
                       Doc strength HIGH
                              ▲
                              │
            Notion            │            SYNAPSE ⭐
            (heavy, weak      │            (Docs + PBI + cc/GH)
             search)          │
                              │
                              │
   Dev integration LOW ───────┼─────── Dev integration HIGH
                              │
                              │
            Confluence        │            Linear
            (legacy)          │            (PBI-only, weak docs)
                              │
                              ▼
                       Doc strength LOW
```

The upper-right is empty. SYNAPSE goes there.

---

## 20. Three-line pitch

> 1. **PBIs, docs, and spreadsheets unified through one block model.**
> 2. **Full two-way GitHub sync; one click on a PBI launches Claude Code to implement and open a PR.**
> 3. **60fps even offline. AI lives inside cells and PBIs, not as a plugin.**
