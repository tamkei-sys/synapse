import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-83 コメント解決(resolve)+折りたたみ acceptance。
 *
 * インラインコメントを作成 → スレッドの「解決にする」で resolved 化 → 本文/返信が
 * 折りたたまれる → 「✓ 解決済み」トグルで未解決に戻すと再展開、を検証する。
 * resolved は props ベース（schema 変更なし）。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Resolve User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('resolve a comment thread collapses it, reopen expands', async ({ browser }) => {
  const email = `e2e-cresolve-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Resolve WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Resolve WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- 本文を入力して選択 → インラインコメント ------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('Resolve this sentence', { delay: 8 });
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await expect(page.getByTestId('bubble-menu')).toBeVisible({ timeout: 5_000 });
  await page.getByTestId('bubble-comment').click();
  await page.getByTestId('comment-composer-input').fill('解決対象のコメント');
  await page.getByTestId('comment-composer-submit').click();

  const thread = page.getByTestId('comments-panel').locator('[data-testid^="comment-thread-"]').first();
  await expect(thread).toBeVisible({ timeout: 10_000 });
  await expect(thread).toContainText('解決対象のコメント');

  // ---- 解決にする → 折りたたみ（本文が消える / data-resolved=true） -----
  await thread.locator('[data-testid^="comment-resolve-"]').click();
  await expect(thread).toHaveAttribute('data-resolved', 'true', { timeout: 10_000 });
  await expect(thread).not.toContainText('解決対象のコメント');

  // ---- 未解決に戻す → 再展開 -------------------------------------------
  await thread.locator('[data-testid^="comment-resolve-"]').click();
  await expect(thread).toHaveAttribute('data-resolved', 'false', { timeout: 10_000 });
  await expect(thread).toContainText('解決対象のコメント');

  await context.close();
});
