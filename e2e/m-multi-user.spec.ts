import { expect, test } from '@playwright/test';

/**
 * M-N-R acceptance：マルチユーザー × コメント × 通知の通し E2E。
 *
 * シナリオ：
 *   1. ユーザー A が signup → ワークスペース作成 → サイドバーが見える
 *   2. /pbi に PBI を 1 件作成して詳細を開く
 *   3. A が PBI の招待トークンを生成（tRPC）し、ユーザー B が新規 signup → 招待リンクを開いて参加
 *   4. A の PBI 詳細でコメント投稿（@B のメンション付き）
 *   5. B でログインし直し、通知ベルに未読 1 件が出る
 *   6. dropdown から通知をクリック → PBI 詳細に遷移して既読になる
 *   7. B がコメントに 👍 リアクションを付けて toggle で外す
 *
 * 既存の S* spec は英語 UI 前提なので壊れている（日本語化済み）。それらの
 * リペアは別 PBI とする。本 spec は完全自前で日本語 UI に追随する。
 */

const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const PASSWORD = 'correct-horse-battery-staple';

test.describe.configure({ mode: 'serial' });

test('M-N-R: invite → comment with mention → notification → reaction', async ({ browser }) => {
  test.setTimeout(120_000);

  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  const aEmail = `e2e-a-${unique()}@synapse.test`;
  const bEmail = `e2e-b-${unique()}@synapse.test`;

  // -- A: signup + workspace --------------------------------------------
  await signup(pageA, 'ユーザー A', aEmail);
  await pageA.getByTestId('workspace-name-input').fill('チーム合宿');
  await pageA.getByTestId('create-workspace-submit').click();
  await expect(pageA.getByTestId('sidebar')).toBeVisible({ timeout: 10_000 });

  // -- A: PBI 作成 ------------------------------------------------------
  await pageA.getByTestId('sidebar-link-/pbi').click();
  await expect(pageA).toHaveURL(/\/pbi$/);
  await pageA.getByTestId('new-pbi-title').fill('結合テストを書こう');
  await pageA.getByTestId('new-pbi-submit').click();
  const pbiLink = pageA.locator('a[href^="/b/"][data-testid^="pbi-title-"]').first();
  await expect(pbiLink).toBeVisible({ timeout: 5_000 });
  const pbiHref = (await pbiLink.getAttribute('href')) ?? '';
  expect(pbiHref).toMatch(/^\/b\/[0-9A-Z]+$/);

  // -- A: 招待トークン発行（tRPC 直叩き、UI 経由のクリップボードを避ける） ---
  const inviteToken = await pageA.evaluate(async (email) => {
    const mod = await import('/src/lib/trpc.ts');
    const ws = await mod.trpc.workspace.listMine.query();
    const w = ws[0];
    const result = await mod.trpc.workspace.invite.mutate({
      workspaceId: w.id,
      email,
      role: 'member',
    });
    return result.token;
  }, bEmail);
  expect(typeof inviteToken).toBe('string');
  expect(inviteToken.length).toBeGreaterThan(10);

  // -- B: signup + 招待受諾 -----------------------------------------------
  await signup(pageB, 'ユーザー B', bEmail);
  // signup 直後はワークスペースが無い状態 → 「最初のワークスペース」フォームが出る
  // 招待 URL に直接飛んで参加
  await pageB.goto(`/invite/${inviteToken}`);
  await pageB.getByTestId('invite-accept').click();
  await expect(pageB).toHaveURL(/\/$/);
  await expect(pageB.getByTestId('sidebar')).toBeVisible({ timeout: 10_000 });

  // -- A: ユーザー B の id を取り出してコメント本文に埋める ------------------
  const bUserId = await pageA.evaluate(async (email) => {
    const mod = await import('/src/lib/trpc.ts');
    const ws = await mod.trpc.workspace.listMine.query();
    const members = await mod.trpc.workspace.listMembers.query({ workspaceId: ws[0].id });
    const b = members.find((m: { email: string }) => m.email === email);
    return b?.userId ?? '';
  }, bEmail);
  expect(bUserId.length).toBeGreaterThan(10);

  // -- A: PBI 詳細へ移動してコメント投稿（@B mention 付き）------------------
  await pageA.goto(pbiHref);
  await pageA
    .getByTestId('new-comment-body')
    .fill(`@${bUserId} 進捗どうですか？レビューお願いします。`);
  await pageA.getByTestId('new-comment-submit').click();
  await expect(pageA.locator('[data-testid^="comment-"]').first()).toBeVisible();

  // -- B: 未読通知が現れる ------------------------------------------------
  await pageB.reload(); // polling を待つより手動 reload で確実
  const bell = pageB.getByTestId('notification-bell');
  await expect(bell.getByTestId('notification-bell-badge')).toHaveText(/[1-9]/, {
    timeout: 15_000,
  });

  // -- B: dropdown から通知クリック → 対象 PBI に遷移 + 既読 -----------------
  await bell.click();
  const firstItem = pageB.locator('[data-testid^="notification-item-"]').first();
  await expect(firstItem).toHaveAttribute('data-unread', 'true');
  await firstItem.click();
  await expect(pageB).toHaveURL(pbiHref);
  // 既読化が反映されると bell の badge が消える
  await expect(bell.getByTestId('notification-bell-badge')).toHaveCount(0, { timeout: 5_000 });

  // -- B: コメントに 👍 リアクション ------------------------------------
  // data-testid="comment-list" の <ul> を avoid するため、<li> に絞る
  const commentRow = pageB.locator('li[data-testid^="comment-"]').first();
  const commentId = (await commentRow.getAttribute('data-testid'))?.replace('comment-', '') ?? '';
  expect(commentId.length).toBeGreaterThan(0);
  await pageB.getByTestId(`reaction-picker-${commentId}`).click();
  await pageB.getByTestId(`reaction-pick-${commentId}-👍`).click();
  const reactionPill = pageB.getByTestId(`reaction-${commentId}-👍`);
  await expect(reactionPill).toBeVisible();
  await expect(reactionPill).toHaveAttribute('data-active', 'true');

  // toggle で外せる
  await reactionPill.click();
  await expect(pageB.getByTestId(`reaction-${commentId}-👍`)).toHaveCount(0);

  await contextA.close();
  await contextB.close();
});

async function signup(page: import('@playwright/test').Page, name: string, email: string) {
  await page.goto('/signup');
  await page.getByLabel('お名前').fill(name);
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel(/パスワード/).fill(PASSWORD);
  await page.getByRole('button', { name: /アカウント作成/i }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 });
}
