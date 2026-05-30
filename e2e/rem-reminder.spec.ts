import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-68 リマインダー acceptance。
 *
 * ページに過去時刻（= すぐ due）のリマインダーを作成 → 「今すぐ確認」(dev、本番は
 * Cron Trigger) で dispatch → 既存の通知ベルに 'reminder' 通知が届く、を検証する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Reminder User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('create a due reminder, process it, notification arrives', async ({ browser }) => {
  const email = `e2e-rem-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const body = `Reminder ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Reminder WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Reminder WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- リマインダー作成（過去時刻 = すぐ due） --------------------------
  await page.getByTestId('page-reminder-button').click();
  await expect(page.getByTestId('reminder-popover')).toBeVisible();
  await page.getByTestId('reminder-datetime').fill('2020-01-01T09:00');
  await page.getByTestId('reminder-body').fill(body);
  await page.getByTestId('reminder-create').click();
  await expect(page.getByTestId('reminder-item').first()).toBeVisible({ timeout: 10_000 });

  // ---- 今すぐ処理（dev ボタン = 本番 cron 相当） ------------------------
  await page.getByTestId('reminder-process-due').click();

  // ---- 通知ベルに未読が立つ（sidebar 版に限定。レスポンシブで 2 つ存在） ----
  const bell = page.getByTestId('sidebar').getByTestId('notification-bell');
  await expect(bell).toHaveAttribute('data-unread', /^[1-9]/, { timeout: 10_000 });

  // ---- ベルを開いてリマインダー通知本文を確認 --------------------------
  await bell.click();
  const dropdown = page.getByTestId('sidebar').getByTestId('notification-dropdown');
  await expect(dropdown).toBeVisible();
  await expect(dropdown).toContainText(body);

  await context.close();
});
