import { expect, test } from '@playwright/test';

/**
 * S1 acceptance test: a brand-new user can sign up, create a workspace,
 * create a page, reload the browser, and still see the page (proving the
 * Block primitive persists end-to-end through Drizzle / Postgres).
 *
 * This single test covers the Definition of Done for sprint S1:
 *   "Can sign in and create a page."
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

test('signup → create workspace → create page → reload persists', async ({ page }) => {
  const email = `e2e-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  // -- sign up --------------------------------------------------------------
  await page.goto('/signup');
  await page.getByLabel('Name').fill('E2E User');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /create account/i }).click();

  // Lands on `/` with the "Create your first workspace" form.
  await expect(page).toHaveURL('/');
  await expect(page.getByTestId('workspace-name-input')).toBeVisible();

  // -- create workspace -----------------------------------------------------
  await page.getByTestId('workspace-name-input').fill('Acme');
  await page.getByTestId('create-workspace-submit').click();

  await expect(page.getByTestId('workspace-name')).toHaveText('Acme');

  // -- create page ----------------------------------------------------------
  await page.getByTestId('new-page-button').click();

  // Page view route lands at /p/<ulid>.
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await expect(page.getByTestId('page-title')).toHaveText('Untitled');

  const pageUrl = page.url();

  // -- reload persists ------------------------------------------------------
  await page.reload();
  await expect(page).toHaveURL(pageUrl);
  await expect(page.getByTestId('page-title')).toHaveText('Untitled');

  // Sanity: child paragraph block exists.
  await expect(page.getByTestId('page-children').locator('li')).toHaveCount(1);
});
