import { expect, test, type Page } from '@playwright/test';

/**
 * プロジェクト/PBI 詳細ページの「配下一覧」カンバン表示 acceptance。
 *
 * プロジェクトを作り、PBI を紐付け、プロジェクト詳細 `/b/$id` の「配下の PBI」欄を
 * カンバンに切り替えて、PBI がボードに並ぶことを検証する（同じ ChildList が
 * sprint 配下 PBI / pbi 配下 SBI も担うため代表 1 本）。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function signUp(page: Page, email: string, password: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill('Child Board User');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(password);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
}

test('project detail renders child PBIs as a kanban', async ({ browser }) => {
  const email = `e2e-childboard-${unique()}@synapse.test`;
  const password = 'correct horse battery staple';
  const prj = `Detail PRJ ${unique()}`;
  const pbiTitle = `Child PBI ${unique()}`;

  const context = await browser.newContext();
  const page = await context.newPage();

  await signUp(page, email, password);
  await page.getByTestId('workspace-name-input').fill('Child WS');
  await page.getByTestId('create-workspace-submit').click();
  await expect(page.getByTestId('workspace-name')).toHaveText('Child WS');

  // ---- プロジェクト作成 → id を取得 ------------------------------------
  await page.goto('/project');
  await page.getByTestId('new-project-name').fill(prj);
  await page.getByTestId('create-project-submit').click();
  const prjLink = page.getByRole('link', { name: prj });
  await expect(prjLink).toBeVisible({ timeout: 10_000 });
  const href = (await prjLink.getAttribute('href')) ?? '';
  const prjId = href.match(/\/b\/([0-9A-Z]+)/)?.[1] ?? '';
  expect(prjId).not.toBe('');

  // ---- PBI をこのプロジェクトに紐付けて作成 ----------------------------
  await page.goto('/pbi');
  await page.getByTestId('new-pbi-title').fill(pbiTitle);
  await page.getByTestId('new-pbi-project').selectOption(prjId);
  await page.getByTestId('new-pbi-submit').click();
  await expect(page.getByText(pbiTitle)).toBeVisible({ timeout: 10_000 });

  // ---- プロジェクト詳細 → 配下 PBI 欄をカンバンに ----------------------
  await page.goto(`/b/${prjId}`);
  await expect(page.getByTestId('child-pbi-view-kanban')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('child-pbi-view-kanban').click();
  await expect(page.getByTestId('kanban-board')).toBeVisible();
  await expect(page.getByTestId('kanban-board')).toContainText(pbiTitle);

  await context.close();
});
