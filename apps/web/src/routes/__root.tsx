import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

import { UserMenu } from '../features/account/user-menu.js';
import { NotificationBell } from '../features/notifications/notification-bell.js';
import { CommandPalette } from '../features/search/command-palette.js';
import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

function RootLayout() {
  return (
    <div className="flex min-h-full flex-col">
      <GlobalChrome />
      <Outlet />
      <CommandPalette />
    </div>
  );
}

/**
 * 全ルート共通の右上装飾。
 *
 * 認証済みのユーザーには常にユーザーメニュー（ログアウト動線）を出し、
 * ワークスペースが 1 つ以上あれば通知ベルも並べる。/login や /signup
 * のように未ログイン専用ページでは何も描画しない。
 */
function GlobalChrome() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  if (!session.data) return null;
  const workspace = workspaces.data?.[0];
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-30 flex items-center gap-2">
      {workspace ? (
        <div className="pointer-events-auto">
          <NotificationBell workspaceId={workspace.id} />
        </div>
      ) : null}
      <div className="pointer-events-auto">
        <UserMenu />
      </div>
    </div>
  );
}
