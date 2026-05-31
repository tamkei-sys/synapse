import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-81 ホーム・ダッシュボード acceptance。
 *
 * ホームに 3 枚のダッシュボードカード（期限間近 PBI / 未読通知 / PBI ステータス）が
 * 表示され、既存のページセクション・新規ページ動線が壊れていないことを検証する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Dash User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('home shows dashboard cards and keeps page flow', async ({ browser }) => {
  const email = `e2e-dash-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Dash WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Dash WS');

  // ---- ダッシュボードカードが 3 枚 ------------------------------------
  await expect(page.getByTestId('dashboard-cards')).toBeVisible();
  await expect(page.getByTestId('card-due')).toBeVisible();
  await expect(page.getByTestId('card-unread')).toBeVisible();
  await expect(page.getByTestId('card-pbi-summary')).toBeVisible();

  // 初期状態の文言
  await expect(page.getByTestId('card-due')).toContainText('期限付きの PBI はありません');
  await expect(page.getByTestId('card-unread')).toContainText('0');

  // ---- 既存の新規ページ動線が壊れていない -----------------------------
  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);

  await context.close();
});
