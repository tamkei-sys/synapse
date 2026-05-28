import { expect, test } from '@playwright/test';

/**
 * S2 acceptance test: a user can sign up, create a workspace, create a
 * page, type into the TipTap editor, transform a line into a heading via
 * the slash command palette, and have all of that persist across a full
 * browser reload.
 *
 * Covers Sprint 2's Definition of Done in CLAUDE.md §8 / docs/roadmap.md
 * ("Document editing works"), and re-covers the S1 DoD as a side effect.
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

test('signup → create page → type + slash heading → reload persists', async ({ page }) => {
  const email = `e2e-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // -- sign up --------------------------------------------------------------
  await page.goto('/signup');
  await page.getByLabel('Name').fill('S2 User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();

  // -- create workspace -----------------------------------------------------
  await page.getByTestId('workspace-name-input').fill('Acme');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Acme');

  // -- create page ----------------------------------------------------------
  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);

  const editor = page.getByTestId('editor-content');
  await editor.click();

  // -- type body + apply heading via slash command --------------------------
  await editor.pressSequentially('Hello SYNAPSE');
  await editor.press('Enter');

  // Open slash menu, narrow to headings, pick H2. (`allowSpaces: false`
  // closes the popup on space, so the query stays single-token.)
  await editor.pressSequentially('/heading');
  await expect(page.getByTestId('slash-menu')).toBeVisible();
  await page.getByTestId('slash-item-heading-2').click();

  // After selection the menu closes and the empty heading line awaits text.
  await editor.pressSequentially('Section A');

  // Edit the title too — exercises the autosave hook on both fields.
  const titleInput = page.getByTestId('page-title-input');
  await titleInput.fill('Notes');

  // Wait for autosave (debounce 1s).
  await expect(page.getByTestId('saved-indicator')).toBeVisible({ timeout: 5_000 });

  const pageUrl = page.url();

  // -- reload persists ------------------------------------------------------
  await page.reload();
  await expect(page).toHaveURL(pageUrl);

  await expect(page.getByTestId('page-title-input')).toHaveValue('Notes');
  // The body still has both blocks: a paragraph "Hello SYNAPSE" + an h2.
  const reloadedEditor = page.getByTestId('editor-content');
  await expect(reloadedEditor.locator('p').first()).toHaveText('Hello SYNAPSE');
  await expect(reloadedEditor.locator('h2')).toHaveText('Section A');
});
