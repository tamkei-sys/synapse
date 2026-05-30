import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-61 Timeline ビュー acceptance。
 *
 * 期限付き PBI を作成 → タイムラインタブ → 時間軸上に PBI が並ぶ、を検証する。
 * PBI データのみで ProseMirror/Yjs には触れないので s3 は不要。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Timeline User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('pbi timeline view places due-dated PBIs on an axis', async ({ browser }) => {
  const email = `e2e-tl-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const title = `Timeline PBI ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Timeline WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Timeline WS');

  // ---- /pbi で期限付き PBI を作成 --------------------------------------
  await page.getByTestId('sidebar-link-/pbi').click();
  await expect(page).toHaveURL(/\/pbi$/);
  await page.getByTestId('new-pbi-title').fill(title);
  await page.getByTestId('new-pbi-due').fill('2026-07-15');
  await page.getByTestId('new-pbi-submit').click();

  // ---- タイムラインビューに PBI が並ぶ ---------------------------------
  await expect(page.getByTestId('view-timeline')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('view-timeline').click();
  await expect(page.getByTestId('timeline-view')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid^="timeline-item-"]')).toHaveCount(1);
  await expect(page.getByTestId('timeline-view')).toContainText(title);
  await expect(page.getByTestId('timeline-view')).toContainText('2026-07-15');

  await context.close();
});
