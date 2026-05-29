import { useQuery, type QueryClient } from '@tanstack/react-query';
import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';

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
 * 全ルート共通の上部装飾。今は通知ベルだけ。認証済み + ワークスペース
 * が 1 つ以上ある時だけ右上に固定表示。
 */
function GlobalChrome() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  const workspace = workspaces.data?.[0];
  if (!workspace) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-30 flex items-center gap-2">
      <div className="pointer-events-auto">
        <NotificationBell workspaceId={workspace.id} />
      </div>
    </div>
  );
}
