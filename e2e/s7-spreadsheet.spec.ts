import { expect, test, type Page } from '@playwright/test';

/**
 * S7 acceptance test: typing `/sheet` in a page embeds an AG Grid
 * spreadsheet wired to HyperFormula. We enter two numbers and a
 * `=SUM(A1:A2)` formula, watch HyperFormula compute the value live,
 * then reload to confirm the cells survived the round-trip.
 *
 * Covers Sprint 7 DoD: "Embeddable in docs; `=SUM` works."
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function setCell(page: Page, ref: string, value: string) {
  // AG Grid puts `row-index` on the row element and `col-id` on each
  // cell. With singleClickEdit on, one click enters edit mode; the
  // visible-but-not-focused input then takes keystrokes.
  const m = /^([A-Z])(\d+)$/.exec(ref);
  if (!m || !m[1] || !m[2]) throw new Error(`bad ref ${ref}`);
  const col = m[1];
  const rowIndex = Number(m[2]) - 1;
  const cell = page.locator(`.ag-row[row-index="${rowIndex}"] .ag-cell[col-id="${col}"]`);
  await cell.click();
  const input = cell.locator('input').first();
  await input.fill(value);
  await page.keyboard.press('Enter');
}

test('/sheet → enter values + =SUM → result computed, persists on reload', async ({ page }) => {
  const email = `e2e-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // -- onboarding ----------------------------------------------------------
  await page.goto('/signup');
  await page.getByLabel('Name').fill('S7 User');
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

  // -- /sheet slash command ------------------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/sheet');
  await expect(page.getByTestId('slash-menu')).toBeVisible();
  await page.getByTestId('slash-item-sheet').click();

  const embed = page.locator('[data-testid^="sheet-embed-"]').first();
  await expect(embed).toBeVisible({ timeout: 10_000 });
  const sheetId = (await embed.getAttribute('data-sheet-id')) ?? '';
  expect(sheetId).not.toEqual('');

  // -- enter A1=10, A2=20, A3==SUM(A1:A2) -----------------------------------
  await setCell(page, 'A1', '10');
  await setCell(page, 'A2', '20');
  await setCell(page, 'A3', '=SUM(A1:A2)');

  // HyperFormula should render the computed value of A3 as "30".
  const a3 = page.locator(`.ag-row[row-index="2"] .ag-cell[col-id="A"]`).first();
  await expect(a3).toHaveText('30');

  // Autosave debounces (~800ms); wait for the indicator to settle.
  await expect(page.getByTestId(`sheet-status-${sheetId}`)).toHaveText('saved', {
    timeout: 5_000,
  });

  const pageUrl = page.url();
  await page.reload();
  await expect(page).toHaveURL(pageUrl);
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });

  // After reload, the sheet re-hydrates from the DB and HF re-evaluates.
  const a3Reloaded = page.locator(`.ag-row[row-index="2"] .ag-cell[col-id="A"]`).first();
  await expect(a3Reloaded).toHaveText('30');
});
