import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-84 同期ブロックの双方向編集 acceptance。
 *
 * ページ B の同期ブロックで「✏️ 編集」に切り替えると、source(ページ A) の Yjs doc に
 * 直結した編集可能ビューが出て同期ステータスになることを検証する。Collaboration
 * を使う（Yjs 相互作用あり）ため s3 co-edit も併走で回す。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('SyncEdit User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('synced block can switch to bidirectional edit mode', async ({ browser }) => {
  const email = `e2e-sb-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const sourceText = `Source body ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('SyncEdit WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('SyncEdit WS');

  // ---- ページ A: source 本文 -----------------------------------------
  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  const pageAId = page.url().match(/\/p\/([0-9A-Z]+)/)?.[1] ?? '';
  await waitForLive(page);
  const editorA = page.getByTestId('editor-content');
  await editorA.click();
  await editorA.pressSequentially(sourceText, { delay: 8 });
  await page.waitForTimeout(3_000);

  // ---- ページ B: 同期ブロック（URL race 回避で A 以外へ遷移を待つ）----
  await page.getByTestId('sidebar-new-page').click();
  await page.waitForURL((u) => /\/p\/[0-9A-Z]+$/.test(u.pathname) && !u.pathname.endsWith(pageAId));
  await page.reload();
  await waitForLive(page);
  const editorB = page.getByTestId('editor-content');
  await editorB.click();
  await editorB.pressSequentially('/sync', { delay: 8 });
  await expect(page.getByTestId('slash-item-sync')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('slash-item-sync').click();
  await page.getByTestId('synced-block-picker').selectOption(pageAId);
  await expect(page.getByTestId('synced-block')).toContainText(sourceText, { timeout: 10_000 });

  // ---- 編集トグル → 編集可能ビュー + 同期ステータス ------------------
  await page.getByTestId('synced-block-edit-toggle').click();
  await expect(page.getByTestId('synced-block-editable')).toBeVisible({ timeout: 10_000 });
  // source 本文が編集ビューにも載っている（Yjs 経由）
  await expect(page.getByTestId('synced-block-editable')).toContainText(sourceText, {
    timeout: 10_000,
  });

  await context.close();
});
