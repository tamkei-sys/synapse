import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-73 バックリンク acceptance。
 *
 * source ページの本文に @page 参照（pageRef）を挿入すると、sync の保存
 * フックが page_link 索引を作り、target ページの下部に「バックリンク」として
 * source が現れる——という end-to-end を検証する。
 *
 * Yjs 保存フック（apps/sync/persistence.ts）に触れる変更なので、CLAUDE.md の
 * 規約に従い E2E を置く。保存は quiet 期間後の debounce なので、target を
 * リロードしながら最大 20s 待つ。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Backlink User');
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

test('inserting an @page ref makes the target show a backlink', async ({ browser }) => {
  const email = `e2e-bl-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const targetTitle = `Tgt${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  // ---- サインアップ + ワークスペース作成 --------------------------------
  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Backlink WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Backlink WS');

  // ---- target ページを作り、検索可能なタイトルを付ける ------------------
  await page.getByTestId('new-page-button').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);
  const targetId = idFromUrl(page.url());
  expect(targetId).not.toEqual('');
  const titleInput = page.getByTestId('page-title-input');
  await titleInput.fill(targetTitle);
  await titleInput.blur();
  await expect(page.getByTestId('title-saved')).toBeVisible({ timeout: 10_000 });

  // ---- source ページを作り、本文に @target を挿入 -----------------------
  await page.getByTestId('sidebar-new-page').click();
  // 新規ページへの遷移を待つ（target とは別の id になるまで）。
  await page.waitForURL((u) => /\/p\/[0-9A-Z]+$/.test(u.pathname) && idFromUrl(u.href) !== targetId, {
    timeout: 10_000,
  });
  await waitForLive(page);
  const sourceId = idFromUrl(page.url());
  expect(sourceId).not.toEqual(targetId);

  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially(`see @${targetTitle}`);

  // サジェストメニューから target を選ぶ。
  await expect(page.getByTestId('page-mention-menu')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId(`page-mention-item-${targetId}`).click();
  // pageRef ノードが挿入された。
  await expect(page.getByTestId(`page-ref-${targetId}`)).toBeVisible({ timeout: 10_000 });

  // ---- target をリロードしつつバックリンク出現を待つ（保存 debounce 込み） --
  await expect(async () => {
    await page.goto(`/p/${targetId}`);
    await expect(page.getByTestId('backlinks-section')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId(`backlink-${sourceId}`)).toBeVisible({ timeout: 5_000 });
  }).toPass({ timeout: 25_000 });

  await context.close();
});
