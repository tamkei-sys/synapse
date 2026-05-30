import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-54 ページ履歴 / バージョン復元 acceptance。
 *
 * 本文 A を書く → 「現在を保存」で版を作る → 本文 B を足す → 履歴から復元 →
 * 本文 A に戻り B が消える → リロード後も維持（Yjs 永続）を検証する。
 *
 * 復元は editor.setContent を Collaboration 経由で Yjs に書くので、schema 互換の
 * s3 (co-edit) も別途回す。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('History User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('save a version, edit further, then restore it', async ({ browser }) => {
  const email = `e2e-hist-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('History WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('History WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- 本文 A を入力 ----------------------------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('Version A content', { delay: 10 });

  // flush（props.doc 更新）を待ってから「現在を保存」で manual 版を作る。
  await page.waitForTimeout(3_000);
  await page.getByTestId('page-history-button').click();
  await expect(page.getByTestId('history-popover')).toBeVisible();
  await page.getByTestId('history-save').click();
  await expect(page.getByTestId('history-item').first()).toBeVisible({ timeout: 10_000 });

  // ---- パネルを閉じて本文 B を追記 --------------------------------------
  await page.keyboard.press('Escape');
  await editor.click();
  await page.keyboard.press('End');
  await editor.pressSequentially(' plus B', { delay: 10 });
  await expect(editor).toContainText('plus B');
  await page.waitForTimeout(3_000);

  // ---- 履歴から最新版（保存した A）を復元 -------------------------------
  await page.getByTestId('page-history-button').click();
  await expect(page.getByTestId('history-popover')).toBeVisible();
  await page.getByTestId('history-restore').first().click();

  // 本文が A に戻り B が消える。
  await expect(editor).toContainText('Version A content', { timeout: 10_000 });
  await expect(editor).not.toContainText('plus B');

  // ---- flush → リロードで永続を確認 ------------------------------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toContainText('Version A content');
  await expect(page.getByTestId('editor-content')).not.toContainText('plus B');

  await context.close();
});
