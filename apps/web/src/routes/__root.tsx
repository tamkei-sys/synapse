import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

import { UserMenu } from '../features/account/user-menu.js';
import { CommandPalette } from '../features/search/command-palette.js';
import { Sidebar } from '../features/sidebar/sidebar.js';
import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  const hasWorkspace = (workspaces.data?.length ?? 0) > 0;
  const sidebarVisible = !!session.data && hasWorkspace;

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
    </div>
  );
}
