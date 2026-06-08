import { expect, test, type Page } from '@playwright/test';

/**
 * PRJ-16 Flow ブロック acceptance。
 *
 * エディタで `/flow` → スターターのフロー (条件付き確率 生成パイプライン) が
 * flowBlock として入り、キャンバスが描画される。「▶ 一括実行」で STEP
 * インジケータが現れ、ノードクリックで詳細パネルが開く。リロード後も Yjs
 * から復元して再描画される。
 */
const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Flow User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

async function waitForLive(page: Page) {
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-status', 'connected', {
    timeout: 10_000,
  });
}

test('flow block renders from /flow, plays steps, opens node detail, and persists', async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const context = await browser.newContext({ locale: 'ja-JP' });
  const page = await context.newPage();

  await signUp(page, `e2e-flow-${unique()}@synapse.test`);
  await page.getByTestId('workspace-name-input').fill('Flow WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Flow WS');

  await page.getByTestId('sidebar-new-page').click();
  await expect(page).toHaveURL(/\/p\/[0-9A-Z]+$/);
  await waitForLive(page);

  // ---- /flow でスターターフローを挿入 ----------------------------------
  const editor = page.getByTestId('editor-content');
  await editor.click();
  await editor.pressSequentially('/flow');
  await expect(page.getByTestId('slash-menu')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('slash-item-flow').click();

  // キャンバスとノードが描画される。
  await expect(page.getByTestId('flow-canvas')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('flow-node-municipal_blend')).toBeVisible();

  // ---- ▶ 一括実行 → STEP インジケータが現れる ------------------------
  await page.getByTestId('flow-run-all').click();
  await expect(page.getByTestId('flow-step-bar')).toBeVisible({ timeout: 10_000 });

  // ---- ノードクリック → 詳細パネル -------------------------------------
  await page.getByTestId('flow-node-municipal_blend').click();
  await expect(page.getByTestId('flow-detail-panel')).toBeVisible();
  await expect(page.getByTestId('flow-detail-panel')).toContainText('Municipal Blend');

  // ---- flush 待ち → リロードしても復元して再描画される -----------------
  await page.waitForTimeout(3_000);
  await page.reload();
  await waitForLive(page);
  await expect(page.getByTestId('flow-canvas')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('flow-node-municipal_blend')).toBeVisible();

  await context.close();
});
