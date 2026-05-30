import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-42 Web bookmark プレビュー acceptance。
 *
 * エディタで `/bookmark` → URL を入力 → サーバ (bookmark.fetch / lib/og-fetch)
 * が OG メタを取得し、リンクカードが挿入され、リロード後も残る (Yjs 永続) という
 * end-to-end を検証する。OG 取得が到達不能でもサーバが fallback カード
 * (title=ホスト名) を返すので、ネットワーク状況に依らずカードは必ず挿入される。
 *
 * bookmark ノード追加は ProseMirror schema 変更なので、別途 s3 (co-edit) も回して
 * Yjs 互換を確認する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Bookmark User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('bookmarking a URL inserts a preview card that persists', async ({ browser }) => {
  const email = `e2e-bookmark-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Bookmark WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Bookmark WS');

  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /bookmark スラッシュ → URL prompt ----------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/bookmark');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('slash-item-bookmark')).toBeVisible();

  // window.prompt に URL を投入（example.com は OG 取得でも fallback でもカード化）。
  page.once('dialog', (d) => {
    void d.accept('https://example.com/');
  });
  await page.getByTestId('slash-item-bookmark').click();

  // ---- bookmark カードが挿入される（OG 取得 or fallback、待ち長め） --------
  const card = page.getByTestId('bookmark-node');
  await expect(card).toBeVisible({ timeout: 20_000 });
  await expect(card).toContainText('example.com');

  // ---- store flush を待ってリロード → 永続化を確認 ------------------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('bookmark-node')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('bookmark-node')).toContainText('example.com');

  await context.close();
});
