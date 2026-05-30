import { expect, test, type Page } from '@playwright/test';

/**
 * プロジェクト/スプリントのカンバン表示 + 各一覧の絞り込み acceptance。
 *
 * - /project で作成 → カンバンに切替 → backlog 列に出る
 * - status フィルタで絞ると消え、クリアで戻る
 * DB のみ/PBI データ操作で ProseMirror/Yjs には触れないので s3 は不要。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Board User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('project kanban view + status filter', async ({ browser }) => {
  const email = `e2e-board-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const name = `Board PRJ ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Board WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Board WS');

  // ---- プロジェクト作成（デフォルト status=backlog） --------------------
  await page.goto('/project');
  await page.getByTestId('new-project-name').fill(name);
  await page.getByTestId('create-project-submit').click();
  await expect(page.getByTestId('project-list')).toContainText(name, { timeout: 10_000 });

  // ---- カンバン表示 → backlog 列に出る ---------------------------------
  await page.getByTestId('project-view-kanban').click();
  await expect(page.getByTestId('kanban-board')).toBeVisible();
  await expect(page.getByTestId('kanban-col-backlog')).toContainText(name);

  // ---- status=archived で絞ると backlog のプロジェクトは消える ----------
  await page.getByTestId('project-view-list').click();
  await page.getByTestId('filter-status').selectOption('archived');
  await expect(page.getByText(name)).toHaveCount(0);

  // ---- クリアで戻る ----------------------------------------------------
  await page.getByTestId('filter-clear').click();
  await expect(page.getByTestId('project-list')).toContainText(name);

  await context.close();
});
