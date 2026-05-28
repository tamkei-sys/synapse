# GitHub Integration — Detailed Spec

This document is the implementation reference for Sprint 5 (GitHub App + two-way sync) and Sprint 10 (CI + embeds).

## 1. Setup model

SYNAPSE provides a **GitHub App** (not a per-user OAuth App).

**Why GitHub App:**

- Per-repository permission granularity
- Higher rate limits (5,000/hour → 15,000/hour with Installation tokens)
- Installed at the org level; survives individual user departures
- Stable webhook subscriptions across the install
- Clear bot identity (`synapse-bot[bot]`) on commits/comments

### Required permissions

| Scope | Access | Why |
|---|---|---|
| Repository contents | Read & write | Branch creation, file embeds |
| Issues | Read & write | Two-way Issue sync |
| Pull requests | Read & write | PR linking, review automation |
| Checks | Read | CI status display |
| Metadata | Read | Default |
| Webhooks | Subscribe | All events below |

### Webhook events to subscribe

- `issues` (opened, edited, closed, reopened, labeled, unlabeled, assigned, unassigned)
- `issue_comment` (created, edited)
- `pull_request` (opened, edited, closed, reopened, ready_for_review, labeled, synchronize)
- `pull_request_review` (submitted)
- `check_suite` (completed)
- `workflow_run` (completed)
- `installation` (created, deleted)
- `installation_repositories` (added, removed)

## 2. Feature matrix

| Feature | Direction | Trigger | Behavior |
|---|---|---|---|
| PBI → Issue create | SYN → GH | PBI moves to `ready` | Create GH Issue, store its number on PBI |
| PBI ↔ Issue two-way sync | both | Either side updates | Field-level merge of title/body/labels/assignees |
| PBI → Branch create | SYN → GH | Button on PBI card | Create `pbi/{id}-{slug}` from default branch |
| PR ↔ PBI auto-link | GH → SYN | PR title/body contains `SYN-123` | Add PR card to PBI |
| CI status display | GH → SYN | `check_suite` / `workflow_run` webhook | Color band on PBI card |
| PR merge → PBI done | GH → SYN | PR merged AND linked PBI exists | PBI status → `done`, record SP delivered |
| Code snippet embed | GH → SYN | `/embed-code` in editor | Live-rendered permalink range |
| Issue import | GH → SYN | Workspace setup wizard | Bulk-convert open Issues to PBIs |

## 3. Webhook intake pipeline

```ts
// apps/api/src/integrations/github/webhook.ts
import { Hono } from 'hono';

export const githubWebhookRouter = new Hono<{ Bindings: Env }>();

githubWebhookRouter.post('/webhooks/github', async (c) => {
  // 1. Verify signature
  const sig = c.req.header('x-hub-signature-256');
  const body = await c.req.text();
  if (!await verifyGitHubSignature(body, sig, c.env.GH_WEBHOOK_SECRET)) {
    return c.json({ error: 'invalid signature' }, 401);
  }

  // 2. Idempotency (replay protection)
  const deliveryId = c.req.header('x-github-delivery')!;
  const seen = await c.env.WEBHOOK_DEDUP.get(`gh:${deliveryId}`);
  if (seen) return c.json({ ok: true, dedup: true });
  await c.env.WEBHOOK_DEDUP.put(`gh:${deliveryId}`, '1', { expirationTtl: 86_400 });

  // 3. Normalize + enqueue
  const event = await normalizeGitHubEvent({
    eventName: c.req.header('x-github-event')!,
    deliveryId,
    payload: JSON.parse(body),
  });
  await c.env.SYNAPSE_EVENTS.send(event);

  return c.json({ ok: true });
});
```

### Queue consumer

```ts
// apps/api/src/integrations/github/consumer.ts
export default {
  async queue(batch: MessageBatch<SynapseEvent>, env: Env) {
    for (const msg of batch.messages) {
      try {
        await routeEvent(msg.body, env);
        msg.ack();
      } catch (err) {
        // Don't retry on permanent errors (e.g. deleted resource)
        if (err instanceof PermanentError) {
          msg.ack();
          await logPermanent(err);
        } else {
          msg.retry({ delaySeconds: Math.min(60 * (msg.attempts ** 2), 600) });
        }
      }
    }
  },
};
```

## 4. Two-way sync algorithm

```
Inputs:
  - syn:   { title, body, labels, assignees, updatedAt, lastSyncedAt }
  - gh:    { title, body, labels, assignees, updatedAt }
  - direction: 'syn→gh' | 'gh→syn'

Steps:
  1. If syn.updatedAt <= syn.lastSyncedAt:
       no local changes — apply gh state wholesale
  2. Else (both sides have changes):
       per-field merge:
         title    : newer-wins
         body     : newer-wins (mark with diff banner)
         labels   : union (dedup)
         assignees: newer-wins
       if user has set "conflict-confirm" mode:
         pause, surface conflict UI, await user choice
  3. Update lastSyncedAt to max(syn.updatedAt, gh.updatedAt)
  4. Push merged state to both sides if direction != one-way
```

## 5. Token & rate-limit hygiene

- Installation tokens are short-lived (1 hour from GH); cache for 50 minutes
- All GH API requests carry `If-None-Match` with stored ETag → 304 doesn't count against rate limit
- Concurrent requests per installation: 4 (configurable)
- Backoff on 403/secondary rate limit: respect `Retry-After`, then exponential

## 6. Branch / PR conventions

When SYNAPSE creates a branch from a PBI:

- Name: `pbi/{pbi-slug}` (e.g. `pbi/syn-145-auth-test`)
- Created from the repo's default branch
- Commit author for any SYNAPSE-initiated commits: `synapse-bot[bot]`
- PR body footer (auto-appended): `Closes SYN-145 (synapse.app/.../syn-145)`
- PR title is suggested but user-editable

## 7. CI status mapping

| GitHub state | SYNAPSE color | Card behavior |
|---|---|---|
| `pending` / `queued` / `in_progress` | Amber | Pulsing dot |
| `success` | Green | Checkmark |
| `failure` / `cancelled` / `timed_out` / `action_required` | Red | Cross + click → open run |
| `skipped` / `neutral` | Gray | Dash |

Multiple checks on one PR: aggregate using GitHub's "combined status" semantics (worst-of).

## 8. Embed widgets

### `/embed-code`

User pastes a GitHub permalink:

```
https://github.com/org/repo/blob/abc123/path/to/file.ts#L10-L25
```

SYNAPSE:
- Resolves to repo + ref + path + line range
- Fetches via Contents API, caches by ETag
- Renders with syntax highlighting (Shiki)
- Live-update when ref is `main`/branch (every 5 min); permalink commits never update

### `/embed-pr`

Renders a compact PR card: title, status, CI summary, review state, last 3 comments. Click expands to full diff in a side panel.

## 9. Issue import

Triggered from workspace setup or manually from Settings → Integrations → GitHub → Import:

- User selects repo(s) and label filter
- Stream of Issues → batched into PBI Blocks
- Existing PBIs (matched by `(repo, number)`) are skipped, not duplicated
- Comments imported as nested Blocks under the PBI

## 10. Error handling & user surfacing

- All sync errors surface in: PBI card → "Sync issues" tooltip
- Per-workspace status page (Settings → Integrations → GitHub → Health) shows last 50 errors and current health
- Critical failures (auth lost, app uninstalled) trigger a banner + email to workspace admins

## 11. Open questions

- Self-hosted GitHub Enterprise support — defer to v2
- Cross-repo PBI move (Issue moves between repos) — not initially supported
- Draft PRs — treat as `open` but visually distinct
