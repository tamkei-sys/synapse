import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-117 「cc で実装」ボタンの展開 acceptance。
 *
 * これまで PBI 一覧（バックログ）にしか無かった ImplementButton を、
 *   - PBI ボードのカンバンカード
 *   - PBI 詳細ページ（PbiHeader）
 * にも出す。カンバンでは存在を、詳細ではクリック→stub セッション完了で
 * 「PR を開く」リンクに変わるところまで確認する。
 */
const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('CC Button User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('implement button appears on the kanban card and PBI detail page', async ({ browser }) => {
  test.setTimeout(60_000);
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, `e2e-cc-${unique()}@synapse.test`);
  await page.getByTestId('workspace-name-input').fill('CC WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('CC WS');

  // ---- PBI を 1 つ作る（直接フォームは常時表示。空ボードに backlog は出ない）---
  await page.goto('/pbi');
  await expect(page.getByTestId('new-pbi-title')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('new-pbi-title').fill('CC ボタン検証 PBI');
  await page.getByTestId('new-pbi-submit').click();
  await expect(page.getByTestId('pbi-backlog')).toBeVisible({ timeout: 10_000 });

  // 作成された PBI 行の implement ボタンから id を取り出す（一覧にはある）。
  const backlogBtn = page.locator('[data-testid^="pbi-implement-"]').first();
  await expect(backlogBtn).toBeVisible({ timeout: 10_000 });
  const tid = (await backlogBtn.getAttribute('data-testid')) ?? '';
  const pbiId = tid.replace('pbi-implement-', '');
  expect(pbiId).not.toEqual('');

  // ---- カンバンビュー：カードにも implement ボタンが出る ----------------
  await page.getByTestId('view-kanban').click();
  await expect(page.getByTestId('pbi-kanban')).toBeVisible();
  await expect(page.getByTestId(`kanban-card-${pbiId}`)).toBeVisible();
  await expect(
    page.getByTestId(`kanban-card-${pbiId}`).getByTestId(`pbi-implement-${pbiId}`),
  ).toBeVisible();

  // ---- PBI 詳細ページ：ヘッダに出て、押すと stub 完了で PR リンクに ------
  await page.goto(`/b/${pbiId}`);
  const detailBtn = page.getByTestId(`pbi-implement-${pbiId}`);
  await expect(detailBtn).toBeVisible({ timeout: 10_000 });
  await detailBtn.click();
  // stub: queued → running → succeeded(~600ms) で擬似 PR URL が付く。
  await expect(page.getByTestId(`pbi-cc-pr-${pbiId}`)).toBeVisible({ timeout: 15_000 });

  await context.close();
});
