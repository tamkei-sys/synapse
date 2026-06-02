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
  // toPass のリトライ予算(45s)が Playwright 既定のテスト上限30sを超えるため明示的に伸ばす。
  // ビルトイン既定テンプレ追加(PBI-105)でメニューが9項目になり、30s 上限に当たりやすくなった。
  test.setTimeout(60_000);
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

  // store の debounce(~2s) を待って本文を flush してから 1 度だけテンプレ化する。
  // （以前は toPass 内で毎回保存していたため、ビルトイン既定テンプレ(PBI-105)で
  //  メニューが重くなると同名テンプレが量産され不安定だった。）
  await page.waitForTimeout(3_000);
  await expect(editor).toContainText(srcBody);
  await page.getByTestId('page-save-template').click();
  await expect(page.getByTestId('page-template-saved-label')).toHaveText(
    'テンプレートに保存しました',
    { timeout: 10_000 },
  );

  // ---- テンプレから新ページ作成 → 本文再現を確認 -----------------------
  const menu = page.getByTestId('template-menu');
  await expect(async () => {
    // メニューを開く（閉じていれば）。
    if (!(await menu.isVisible().catch(() => false))) {
      await page.getByTestId('sidebar-templates').click();
    }
    await expect(menu).toBeVisible({ timeout: 5_000 });

    // ビルトイン既定テンプレ(PBI-105)が常に並ぶので、自分の保存テンプレ(srcTitle)
    // を名前で特定する。最下段でオーバーフロー内に隠れるため明示スクロールしてから
    // クリックする（absolute popover では自動スクロールが効かないことがある）。
    const myTpl = menu.getByRole('button', { name: srcTitle });
    await expect(myTpl).toBeVisible({ timeout: 5_000 });
    // 最下段の項目は overflow popover 内で物理クリックが actionability 待ちで
    // 固まることがあるため、onClick を直接発火する（dispatchEvent はスクロール/
    // インターセプト非依存）。
    await myTpl.dispatchEvent('click');

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
