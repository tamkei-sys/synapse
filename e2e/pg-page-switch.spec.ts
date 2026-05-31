import { expect, test, type Page } from '@playwright/test';

/**
 * 子ページ遷移で本文が切り替わる回帰テスト。
 *
 * バグ: pageId が変わっても PageShell / useEditor が再利用され、本文が前ページの
 * まま（タイトルだけ変わる）。修正は PageShell に key={pageId} を付けてサブツリーを
 * 作り直すこと。本テストは **reload を挟まず** SPA 遷移だけで本文が入れ替わることを
 * 検証する（reload で隠れていた本来のバグを捕まえる）。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Switch User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('navigating to a child page swaps the body without reload', async ({ browser }) => {
  const email = `e2e-pgswitch-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const parentText = `PARENT body ${unique()}`;
  const childText = `CHILD body ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Switch WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Switch WS');

  // ---- 親ページに本文を書く -------------------------------------------
  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  const parentUrl = page.url();
  const parentId = parentUrl.match(/\/p\/([0-9A-Z]+)/)?.[1] ?? '';
  await waitForLive(page);
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially(parentText, { delay: 8 });
  await page.waitForTimeout(3_000); // flush

  // ---- /page スラッシュで子ページを作成（pageRef が挿入される） --------
  await editor.press('Enter');
  await editor.pressSequentially('/page', { delay: 8 });
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  page.once('dialog', (d) => void d.accept('子ページA'));
  await page.getByTestId('slash-item-page').click();

  // pageRef リンクが本文に現れる → クリックで子へ SPA 遷移
  const childLink = editor.locator('a[data-page-ref], [data-testid^="page-ref"]').first();
  await expect(childLink).toBeVisible({ timeout: 10_000 });
  await childLink.click();

  // ---- 子ページに遷移（reload なし）→ 別 URL・空本文 -------------------
  await page.waitForURL((u) => /\/p\/[0-9A-Z]+$/.test(u.pathname) && !u.pathname.endsWith(parentId));
  await waitForLive(page);
  // 本文が親のテキストを引きずっていないこと（これがバグの核心）
  await expect(page.getByTestId('editor-content')).not.toContainText(parentText, {
    timeout: 10_000,
  });

  // ---- 子ページに本文を書く → 反映される ------------------------------
  const childEditor = page.getByTestId('editor-content');
  await childEditor.click();
  await childEditor.pressSequentially(childText, { delay: 8 });
  await expect(childEditor).toContainText(childText);

  // ---- 親に戻ると親の本文（reload なしで切り替わる） ------------------
  await page.goto(parentUrl); // ルート再訪（フルリロードではなく URL 遷移）
  await waitForLive(page);
  await expect(page.getByTestId('editor-content')).toContainText(parentText, { timeout: 10_000 });
  await expect(page.getByTestId('editor-content')).not.toContainText(childText);

  await context.close();
});
