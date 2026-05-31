import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-87 Timeline 期間バー acceptance。
 *
 * 期限 + 見積付き PBI を作成 → タイムラインで点ではなく期間バーが描画されることを
 * 検証する（estimate を所要日数とみなしたバー）。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Gantt User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('timeline renders a duration bar for an estimated PBI', async ({ browser }) => {
  const email = `e2e-gt-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const title = `Gantt PBI ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Gantt WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Gantt WS');

  // ---- 期限 + 見積付き PBI を作成 -------------------------------------
  await page.getByTestId('sidebar-link-/pbi').click();
  await expect(page).toHaveURL(/\/pbi$/);
  await page.getByTestId('new-pbi-title').fill(title);
  await page.getByTestId('new-pbi-due').fill('2026-08-20');
  await page.getByTestId('new-pbi-estimate').selectOption({ index: 3 });
  await page.getByTestId('new-pbi-submit').click();
  await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 });

  // ---- タイムライン → 期間バーが出る ----------------------------------
  await page.getByTestId('view-timeline').click();
  await expect(page.getByTestId('timeline-view')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid^="timeline-bar-"]')).toHaveCount(1);
  await expect(page.getByTestId('timeline-view')).toContainText('2026-08-20');

  await context.close();
});
