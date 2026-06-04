import { expect, test, type Page } from '@playwright/test';

/**
 * ADR-0011 acceptance: writing a page body through the sync server's internal
 * doc-write endpoint (what synapse_append_doc does over MCP) reflects into a
 * *live* editor in real time — proving the openDirectConnection path broadcasts
 * to connected clients and persists, not just a detached write.
 *
 * The endpoint is internal + secret-gated; in CI the e2e job sets
 * SYNC_INTERNAL_SECRET so apps/sync starts it on :1235.
 */
const INTERNAL_URL = process.env['SYNC_INTERNAL_URL'] ?? 'http://localhost:1235';
const INTERNAL_SECRET = process.env['SYNC_INTERNAL_SECRET'] ?? 'dev-internal-secret';

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Doc Append User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('append_doc endpoint reflects markdown into a live editor', async ({ page }) => {
  const email = `e2e-da-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Doc Append WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Doc Append WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toBeVisible();

  const pageId = page.url().split('/p/')[1] ?? '';
  expect(pageId).not.toEqual('');
  const marker = `Appended-${unique()}`;

  // Simulate synapse_append_doc: a trusted internal write through the sync
  // server (no actorUserId → system write, gated by the shared secret).
  const res = await fetch(`${INTERNAL_URL}/internal/doc/write`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-secret': INTERNAL_SECRET },
    body: JSON.stringify({ blockId: pageId, mode: 'append', markdown: `## ${marker}\n\nappended body text` }),
  });
  expect(res.status).toBe(200);

  // openDirectConnection broadcasts to this already-open editor — the heading
  // and paragraph show up without a reload.
  const editor = page.getByTestId('editor-content');
  await expect(editor).toContainText(marker, { timeout: 15_000 });
  await expect(editor).toContainText('appended body text');

  // And it survives a reload (persisted, not just in-memory).
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toContainText(marker, { timeout: 10_000 });
});
