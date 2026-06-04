import { expect, test, type Page } from '@playwright/test';

/**
 * PBI-118 ボード表示切替の永続化 acceptance。
 *
 * PBI ボードでカンバン表示に切り替え → PBI 詳細ページへ遷移 → ブラウザ「戻る」で
 * 戻ったとき、リストに戻らずカンバン表示が保持されることを確認する。
 * （表示選択を localStorage に保存しているため、再マウントでも復元される。）
 */
const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('View Persist User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill('correct horse battery staple');
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('kanban view is preserved after navigating to a detail page and going back', async ({
  browser,
}) => {
  test.setTimeout(60_000);
  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, `e2e-view-${unique()}@synapse.test`);
  await page.getByTestId('workspace-name-input').fill('View WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('View WS');

  // PBI を 1 つ作る（カンバンが描画される最低条件）。
  await page.goto('/pbi');
  await expect(page.getByTestId('new-pbi-title')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('new-pbi-title').fill('表示保持の検証 PBI');
  await page.getByTestId('new-pbi-submit').click();
  await expect(page.getByTestId('pbi-backlog')).toBeVisible({ timeout: 10_000 });

  // カンバン表示に切り替える。
  await page.getByTestId('view-kanban').click();
  await expect(page.getByTestId('pbi-kanban')).toBeVisible();
  const card = page.locator('[data-testid^="kanban-card-"]').first();
  await expect(card).toBeVisible();
  const pbiId = ((await card.getAttribute('data-testid')) ?? '').replace('kanban-card-', '');
  expect(pbiId).not.toEqual('');

  // PBI 詳細ページへ遷移（履歴に積む）。
  await page.goto(`/b/${pbiId}`);
  await expect(page.getByTestId('pbi-title-input')).toBeVisible({ timeout: 10_000 });

  // ブラウザ「戻る」→ ボードはカンバンのまま（リストに戻らない）。
  await page.goBack();
  await expect(page.getByTestId('pbi-kanban')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId('view-kanban')).toHaveAttribute('aria-selected', 'true');
  // リスト（backlog）は出ていないこと。
  await expect(page.getByTestId('pbi-backlog')).toHaveCount(0);

  await context.close();
});
