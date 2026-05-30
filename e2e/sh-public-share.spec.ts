import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-56 公開共有 acceptance。
 *
 * ページを書く → 「共有」→「公開する」で read-only URL を発行 → **未認証の
 * 別ブラウザコンテキスト**でその URL を開くと本文が見える → 「公開を停止」
 * すると未認証では見えなくなる、という end-to-end を検証する。
 *
 * 公開ページは props.doc スナップショット (store フックが quiet 後に更新) を
 * 読むので、本文反映を toPass でリトライして flush の遅れを吸収する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Share User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('public share is viewable anonymously and hidden after disabling', async ({ browser }) => {
  const email = `e2e-share-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const body = `PUBBODY-${unique()}`;

  // ---- オーナー: サインアップ + WS + ページ作成 + 本文 ---------------------
  const ownerCtx = await browser.newContext();
  const owner = await ownerCtx.newPage();
  await signUp(owner, email, password);
  await owner.getByTestId('workspace-name-input').fill('Public WS');
  await owner.getByTestId('create-workspace-submit').click();
  await expect(owner.getByTestId('workspace-name')).toHaveText('Public WS');

  await owner.getByTestId('new-page-button').click();
  await expect(owner).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(owner);

  const titleInput = owner.getByTestId('page-title-input');
  await titleInput.fill('Public Title');
  await titleInput.blur();
  await expect(owner.getByTestId('title-saved')).toBeVisible({ timeout: 10_000 });

  const editor = owner.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially(body);
  await expect(editor).toContainText(body);
  // store の debounce(~2s) を待ってから公開（props.doc に本文が乗るのを待つ）。
  await owner.waitForTimeout(3_000);

  // ---- 共有 → 公開する → URL 取得 ---------------------------------------
  await owner.getByTestId('page-share-button').click();
  await expect(owner.getByTestId('share-popover')).toBeVisible();
  await owner.getByTestId('share-enable').click();
  await expect(owner.getByTestId('share-url')).toBeVisible({ timeout: 10_000 });
  const url = await owner.getByTestId('share-url').inputValue();
  const token = url.split('/share/')[1] ?? '';
  expect(token).not.toEqual('');

  // ---- 未認証コンテキストで公開ページを閲覧 -----------------------------
  const guestCtx = await browser.newContext();
  const guest = await guestCtx.newPage();
  await expect(async () => {
    await guest.goto(`/share/${token}`);
    await expect(guest.getByTestId('public-title')).toHaveText('Public Title', { timeout: 5_000 });
    await expect(guest.getByTestId('public-editor-content')).toContainText(body, {
      timeout: 5_000,
    });
  }).toPass({ timeout: 30_000 });
  // chrome（サイドバー）が出ていないこと = 顧客にクリーンな1枚ページ。
  await expect(guest.getByTestId('sidebar')).toHaveCount(0);

  // ---- 公開を停止 → 未認証では見えなくなる ------------------------------
  await owner.getByTestId('share-disable').click();
  await expect(owner.getByTestId('share-enable')).toBeVisible({ timeout: 10_000 });

  await expect(async () => {
    await guest.goto(`/share/${token}`);
    await expect(guest.getByTestId('public-not-found')).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 20_000 });

  await ownerCtx.close();
  await guestCtx.close();
});
