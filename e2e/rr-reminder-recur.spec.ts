import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-85 リマインダー繰り返し + スヌーズ acceptance。
 *
 * 繰り返し「毎日」でリマインダーを作成 → 一覧に繰り返しバッジが出る → スヌーズ
 * ボタンで後ろ倒し（item が残る）を検証する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Recur User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('create a daily reminder and snooze it', async ({ browser }) => {
  const email = `e2e-rr-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Recur WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Recur WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- 繰り返し「毎日」でリマインダー作成 -----------------------------
  await page.getByTestId('page-reminder-button').click();
  await expect(page.getByTestId('reminder-popover')).toBeVisible();
  await page.getByTestId('reminder-datetime').fill('2026-01-01T09:00');
  await page.getByTestId('reminder-body').fill('毎朝の確認');
  await page.getByTestId('reminder-recurrence').selectOption('daily');
  await page.getByTestId('reminder-create').click();

  // ---- 一覧に出て、繰り返しバッジ「毎日」が表示される ------------------
  const item = page.getByTestId('reminder-item').first();
  await expect(item).toBeVisible({ timeout: 10_000 });
  await expect(item).toContainText('毎日');

  // ---- スヌーズ → item は残る（後ろ倒し） -----------------------------
  await item.getByTestId('reminder-snooze').click();
  await expect(page.getByTestId('reminder-item').first()).toBeVisible();

  await context.close();
});
