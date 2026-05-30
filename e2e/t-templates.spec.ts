import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-55 テンプレート acceptance。
 *
 * ページ本文を書く → 「テンプレートとして保存」→ サイドバーの「📋」から
 * そのテンプレを選んで新ページを作る → 新ページに元の本文が再現される、
 * という end-to-end を検証する。
 *
 * 肝は Yjs state blob のコピー。テンプレから作った新ページは新しい
 * blockId なので IndexedDB キャッシュが無く、本文はサーバの
 * block_yjs_state から fetch される。よって本文が出れば
 *   ① 元ページの state がサーバへ flush され
 *   ② saveAsTemplate がテンプレへ複製し
 *   ③ createFromTemplate が新ページへ複製した
 * すべてが通った証拠になる。
 *
 * 保存は quiet 期間後の debounce (Hocuspocus 既定 2s) なので、テンプレ化〜
 * 本文確認を toPass でリトライして flush の遅れを吸収する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Template User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

function idFromUrl(url: string): string {
  return url.split('/p/')[1] ?? '';
}

test('saving a page as a template and creating from it reproduces the body', async ({
  browser,
}) => {
  const email = `e2e-tpl-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const srcTitle = `TplSrc${unique()}`;
  const srcBody = `TPLBODY-${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  // ---- サインアップ + ワークスペース作成 --------------------------------
  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Template WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Template WS');

  // ---- 元ページを作り、タイトルと本文を書く -----------------------------
  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);
  const srcId = idFromUrl(page.url());
  expect(srcId).not.toEqual('');

  const titleInput = page.getByTestId('page-title-input');
  await titleInput.fill(srcTitle);
  await titleInput.blur();
  await expect(page.getByTestId('title-saved')).toBeVisible({ timeout: 10_000 });

  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially(srcBody);
  await expect(editor).toContainText(srcBody);

  // store の debounce(~2s) を待ってからテンプレ化する。最初の試行で確実に
  // flush 済みにしてテンプレの量産を抑える。遅れても下の toPass で吸収。
  await page.waitForTimeout(3_000);

  // ---- テンプレ化 → テンプレから新ページ作成 → 本文再現を確認 -----------
  await expect(async () => {
    // 毎リトライで元ページに戻ってからテンプレ化する（新ページ側を誤って
    // テンプレ化しないため）。本文が復元されていることも確認。
    await page.goto(`/p/${srcId}`);
    await waitForLive(page);
    await expect(page.getByTestId('editor-content')).toContainText(srcBody, { timeout: 5_000 });

    await page.getByTestId('page-save-template').click();
    await expect(page.getByTestId('page-template-saved-label')).toHaveText(
      'テンプレートに保存しました',
      { timeout: 5_000 },
    );

    // サイドバーの「📋」からテンプレ一覧を開き、最新テンプレを選ぶ。
    await page.getByTestId('sidebar-templates').click();
    await expect(page.getByTestId('template-menu')).toBeVisible({ timeout: 5_000 });
    const items = page.locator('[data-testid^="template-item-"]');
    await expect(items.first()).toBeVisible({ timeout: 5_000 });
    await items.last().click();

    // 新ページ(別 id)へ遷移し、本文がサーバ state 経由で再現される。
    await page.waitForURL(
      (u) => /\/p\/[0-9A-Z]+$/.test(u.pathname) && idFromUrl(u.href) !== srcId,
      { timeout: 10_000 },
    );
    await waitForLive(page);
    await expect(page.getByTestId('editor-content')).toContainText(srcBody, { timeout: 5_000 });
  }).toPass({ timeout: 45_000 });

  await context.close();
});
