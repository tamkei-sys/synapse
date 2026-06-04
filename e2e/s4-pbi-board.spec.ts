import { expect, test } from '@playwright/test';

/**
 * S4 acceptance test: typing `/pbi` in a page creates a PBI that shows
 * up as a card on the Backlog and Kanban boards. Cycling status in one
 * view propagates to the others — proving the Block model is the
 * single source of truth.
 *
 * Covers Sprint 4 DoD: "`/pbi` in doc → card on board."
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

test('/pbi in doc → card on Backlog → status cycles to Kanban', async ({ page }) => {
  const email = `e2e-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // -- sign up + create workspace + page -----------------------------------
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('S4 User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();

  await page.getByTestId('workspace-name-input').fill('Acme');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Acme');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);

  // Editor needs the WS connection up so collaboration extension is live.
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });

  // -- /pbi slash command --------------------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/pbi');
  await expect(page.getByTestId('slash-menu')).toBeVisible();
  await page.getByTestId('slash-item-pbi').click();

  // Wait for the ref node to land. The PBI id is unknown ahead of time;
  // match by the partial test id prefix.
  const pbiRef = page.locator('[data-testid^="pbi-ref-"]').first();
  await expect(pbiRef).toBeVisible({ timeout: 10_000 });
  await expect(pbiRef).toContainText('無題 PBI');

  const pbiId = (await pbiRef.getAttribute('data-pbi-id')) ?? '';
  expect(pbiId).not.toEqual('');

  // -- navigate to the PBI board (Backlog) ---------------------------------
  await page.goto('/pbi');
  await expect(page).toHaveURL('/pbi');

  // Default view is Backlog.
  await expect(page.getByTestId('pbi-backlog')).toBeVisible();
  await expect(page.getByTestId(`pbi-title-${pbiId}`)).toHaveText('無題 PBI');

  // Cycle status: backlog → ready
  const statusBtn = page.getByTestId(`pbi-status-${pbiId}`);
  await expect(statusBtn).toHaveAttribute('data-status', 'backlog');
  await statusBtn.click();
  await expect(statusBtn).toHaveAttribute('data-status', 'ready');

  // -- Kanban view shows the card in the right column ----------------------
  await page.getByTestId('view-kanban').click();
  await expect(page.getByTestId('pbi-kanban')).toBeVisible();
  const readyColumn = page.getByTestId('kanban-column-ready');
  await expect(readyColumn.getByTestId(`kanban-card-${pbiId}`)).toBeVisible();
});
