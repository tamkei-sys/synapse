import { createHmac, randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

/**
 * S5 acceptance test: linking a PBI to a GitHub Issue and processing an
 * inbound webhook updates the board state in real time.
 *
 * The webhook is forged with the same secret the dev container stores in
 * apps/api/.dev.vars (`GITHUB_WEBHOOK_SECRET=dev-only-webhook-secret`).
 * Real GitHub App installation lives outside this test.
 *
 * Covers Sprint 5 DoD: "PBI ↔ Issue auto-synced."
 */

const WEBHOOK_SECRET = 'dev-only-webhook-secret';
const API_BASE = process.env['VITE_API_URL'] ?? 'http://localhost:8787';

function signPayload(body: string): string {
  return 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
}

async function postWebhook(event: string, body: object): Promise<Response> {
  const raw = JSON.stringify(body);
  return fetch(`${API_BASE}/api/integrations/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': event,
      'x-github-delivery': randomUUID(),
      'x-hub-signature-256': signPayload(raw),
    },
    body: raw,
  });
}

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

test('link PBI to issue → webhook close → PBI flips to done', async ({ page }) => {
  const email = `e2e-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // -- sign up + workspace + page + /pbi -----------------------------------
  await page.goto('/signup');
  await page.getByLabel('Name').fill('S5 User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();

  await page.getByTestId('workspace-name-input').fill('Acme');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Acme');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });

  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/pbi');
  await page.getByTestId('slash-item-pbi').click();
  const pbiRef = page.locator('[data-testid^="pbi-ref-"]').first();
  await expect(pbiRef).toBeVisible({ timeout: 10_000 });
  const pbiId = (await pbiRef.getAttribute('data-pbi-id')) ?? '';
  expect(pbiId).not.toEqual('');

  // -- board: link to acme/widgets#42 --------------------------------------
  await page.goto('/pbi');
  await page.getByTestId(`pbi-link-open-${pbiId}`).click();
  await page.getByTestId(`pbi-link-owner-${pbiId}`).fill('acme');
  await page.getByTestId(`pbi-link-repo-${pbiId}`).fill('widgets');
  await page.getByTestId(`pbi-link-issue-${pbiId}`).fill('42');
  await page.getByTestId(`pbi-link-submit-${pbiId}`).click();

  // Linked badge appears.
  const badge = page.getByTestId(`pbi-github-badge-${pbiId}`);
  await expect(badge).toBeVisible();
  await expect(badge).toContainText('acme/widgets#42');

  // -- forge a webhook: GitHub closes issue acme/widgets#42 ----------------
  const closeResp = await postWebhook('issues', {
    action: 'closed',
    issue: {
      number: 42,
      title: 'Fix the foo',
      state: 'closed',
      html_url: 'https://github.com/acme/widgets/issues/42',
    },
    repository: {
      name: 'widgets',
      owner: { login: 'acme' },
    },
  });
  expect(closeResp.status).toBe(200);

  // -- board reflects the close: status='done', badge state='closed' --------
  await page.reload();
  await expect(page.getByTestId(`pbi-status-${pbiId}`)).toHaveAttribute('data-status', 'done');
  await expect(page.getByTestId(`pbi-github-badge-${pbiId}`)).toHaveAttribute(
    'data-state',
    'closed',
  );

  // -- replay safety: same delivery id is deduped (smoke check the path) ----
  const replayDelivery = randomUUID();
  const raw = JSON.stringify({
    action: 'reopened',
    issue: { number: 42, title: 'Fix the foo', state: 'open' },
    repository: { name: 'widgets', owner: { login: 'acme' } },
  });
  const sig = signPayload(raw);
  const first = await fetch(`${API_BASE}/api/integrations/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'issues',
      'x-github-delivery': replayDelivery,
      'x-hub-signature-256': sig,
    },
    body: raw,
  });
  expect(first.status).toBe(200);
  const second = await fetch(`${API_BASE}/api/integrations/github/webhook`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-github-event': 'issues',
      'x-github-delivery': replayDelivery,
      'x-hub-signature-256': sig,
    },
    body: raw,
  });
  const replayBody = (await second.json()) as { deduped?: boolean };
  expect(replayBody.deduped).toBe(true);
});
