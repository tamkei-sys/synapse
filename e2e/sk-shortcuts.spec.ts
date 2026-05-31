import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-91 ショートカット一覧モーダル acceptance。
 *
 * `?`（Shift+/）でショートカット一覧モーダルが開き、Esc / ✕ で閉じることを検証。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Shortcut User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('press ? to open shortcuts modal, Esc to close', async ({ browser }) => {
  const email = `e2e-sk-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Shortcut WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Shortcut WS');

  // ---- ? でモーダルが開く（本文フォーカスを外してから） ----------------
  await page.locator('body').click();
  await page.keyboard.press('Shift+Slash');
  await expect(page.getByTestId('shortcuts-modal')).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId('shortcuts-modal')).toContainText('コマンドパレット');

  // ---- Esc で閉じる ----------------------------------------------------
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('shortcuts-modal')).toHaveCount(0);

  // ---- 再度開いて ✕ で閉じる -------------------------------------------
  await page.keyboard.press('Shift+Slash');
  await expect(page.getByTestId('shortcuts-modal')).toBeVisible();
  await page.getByTestId('shortcuts-close').click();
  await expect(page.getByTestId('shortcuts-modal')).toHaveCount(0);

  await context.close();
});
