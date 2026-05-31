import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext, useLocation } from '@tanstack/react-router';

import { UserMenu } from '../features/account/user-menu.js';
import { NotificationBell } from '../features/notifications/notification-bell.js';
import { ShortcutsHelp } from '../features/help/shortcuts-help.js';
import { CommandPalette } from '../features/search/command-palette.js';
import { Sidebar } from '../features/sidebar/sidebar.js';
import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';
import { useUiStore } from '../stores/ui-store.js';

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const session = useSession();
  const location = useLocation();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  const current = useCurrentWorkspaceFromList(workspaces.data);
  const hasWorkspace = !!current;
  const sidebarVisible = !!session.data && hasWorkspace;
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);

  // 公開共有ページ (/share/<token>) は chrome 無しで描画。サイドバー・コマンド
  // パレット・モバイル topbar を出さず、顧客にはページ本文だけを見せる (PBI-56)。
  if (location.pathname.startsWith('/share/')) {
    return (
      <main id="main-content" role="main" className="min-h-full flex-1">
        <Outlet />
      </main>
    );
  }

  return (
    <div className="flex min-h-full">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-40 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:dark:bg-zinc-900"
      >
        メインコンテンツへスキップ
      </a>
      {sidebarVisible ? <Sidebar /> : null}
      <main
        id="main-content"
        role="main"
        className={`flex min-h-full min-w-0 flex-1 flex-col ${sidebarVisible ? 'md:ml-60' : ''}`}
      >
        {/* モバイル top bar — サイドバーがあるケースだけ表示。md 以上では非表示。
            ハンバーガー + 通知ベル + UserMenu を載せて、サイドバー無しでも
            主要動作にたどり着けるようにする。 */}
        {sidebarVisible && current ? (
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur md:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
            <button
              type="button"
              onClick={toggleMobileSidebar}
              data-testid="mobile-sidebar-toggle"
              aria-label="サイドバーを開く"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-zinc-300 bg-white text-lg hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              ☰
            </button>
            <span className="truncate text-sm font-medium" data-testid="mobile-topbar-workspace">
              {current.name}
            </span>
            <div className="flex items-center gap-2">
              <NotificationBell workspaceId={current.id} />
              <UserMenu />
            </div>
          </div>
        ) : null}
        {/* サイドバーが描画されないケース（未ログイン / ワークスペース未作成）
            だけ、UserMenu を右上に出す。サイドバーがあるときはサイドバー下端に
            UserMenu が常駐するので二重表示を避ける。 */}
        {session.data && !hasWorkspace ? (
          <div className="fixed right-4 top-4 z-30">
            <UserMenu />
          </div>
        ) : null}
        <Outlet />
      </main>
      <CommandPalette />
      <ShortcutsHelp />
    </div>
  );
}
