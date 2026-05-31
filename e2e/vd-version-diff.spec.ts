import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-86 ページ履歴の文字単位 diff acceptance。
 *
 * 本文 A を書いて版保存 → 本文を B に変更 → 履歴の「差分」→ diff モーダルが開き、
 * 旧版→現在の差分が表示されることを検証する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Diff User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('show word-level diff between a version and current', async ({ browser }) => {
  const email = `e2e-vd-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Diff WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Diff WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- 本文 A → 版保存 -------------------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('alpha original text', { delay: 8 });
  await page.waitForTimeout(3_000);
  await page.getByTestId('page-history-button').click();
  await page.getByTestId('history-save').click();
  await expect(page.getByTestId('history-item').first()).toBeVisible({ timeout: 10_000 });

  // ---- 本文を変更（B） -------------------------------------------------
  await page.keyboard.press('Escape');
  await editor.click();
  await page.keyboard.press('End');
  await editor.pressSequentially(' plus appended', { delay: 8 });
  await page.waitForTimeout(2_000);

  // ---- 履歴 → 差分モーダル --------------------------------------------
  await page.getByTestId('page-history-button').click();
  await page.getByTestId('history-diff').first().click();
  await expect(page.getByTestId('history-diff-modal')).toBeVisible({ timeout: 10_000 });
  // 追記した語が差分本文に含まれる
  await expect(page.getByTestId('history-diff-body')).toContainText('appended');

  await context.close();
});
