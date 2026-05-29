/**
 * Notion 風の左サイドバー。
 *
 * 構成（上→下）：
 *   1. ワークスペース切替（WorkspaceSwitcher）
 *   2. 通知ベル + 検索ヒント
 *   3. 主要ナビ（ホーム / プロジェクト / スプリント / PBI / SBI）
 *   4. ページ一覧（直近 10 件） + 新規ページ
 *   5. 設定（メンバー / トークン / 監査ログ）
 *   6. 一番下にユーザーメニュー（ログアウト）
 *
 * 認証済み + 何かしらのワークスペースがあるときだけ描画される。
 * 未ログイン / ワークスペース未作成のときは __root の GlobalChrome が
 * null を返してサイドバーは無し。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';

import { useCurrentWorkspaceFromList } from '../../lib/current-workspace.js';
import { trpc } from '../../lib/trpc.js';
import { UserMenu } from '../account/user-menu.js';
import { NotificationBell } from '../notifications/notification-bell.js';
import { WorkspaceSwitcher } from './workspace-switcher.js';

export function Sidebar() {
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });
  const current = useCurrentWorkspaceFromList(workspaces.data);
  if (!current) return null;

  return (
    <aside
      data-testid="sidebar"
      className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col gap-3 border-r border-zinc-200 bg-zinc-50 px-3 py-4 text-sm md:flex dark:border-zinc-800 dark:bg-zinc-950"
    >
      <WorkspaceSwitcher current={current} />

      <div className="flex items-center justify-between rounded-md bg-white/40 px-2 py-1.5 dark:bg-zinc-900/40">
        <span className="text-xs text-zinc-500">クイック検索 ⌘K</span>
        <NotificationBell workspaceId={current.id} />
      </div>

      <NavSection>
        <NavLink to="/" exact icon="🏠">
          ホーム
        </NavLink>
      </NavSection>

      <NavSection title="プロジェクト管理">
        <NavLink to="/project" icon="📁">
          プロジェクト
        </NavLink>
        <NavLink to="/sprint" icon="🏃">
          スプリント
        </NavLink>
        <NavLink to="/pbi" icon="✅">
          PBI
        </NavLink>
        <NavLink to="/sbi" icon="🟢">
          SBI
        </NavLink>
      </NavSection>

      <PagesSection workspaceId={current.id} />

      <NavSection title="設定">
        <NavLink to="/settings/members" icon="👥">
          メンバー
        </NavLink>
        <NavLink to="/settings/tokens" icon="🔑">
          API トークン
        </NavLink>
        <NavLink to="/settings/audit-log" icon="📋">
          監査ログ
        </NavLink>
      </NavSection>

      <div className="mt-auto flex items-center justify-end rounded-md bg-white/40 px-2 py-1.5 dark:bg-zinc-900/40">
        <UserMenu placement="top" />
      </div>
    </aside>
  );
}

function NavSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div>
      {title ? (
        <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {title}
        </p>
      ) : null}
      <ul className="space-y-0.5">{children}</ul>
    </div>
  );
}

function NavLink({
  to,
  icon,
  exact,
  children,
}: {
  to: string;
  icon: string;
  exact?: boolean;
  children: React.ReactNode;
}) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
  return (
    <li>
      <Link
        to={to}
        data-testid={`sidebar-link-${to}`}
        data-active={active}
        className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
          active
            ? 'bg-violet-100 font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
            : 'hover:bg-zinc-200 dark:hover:bg-zinc-800'
        }`}
      >
        <span className="w-4 text-center">{icon}</span>
        <span className="min-w-0 truncate">{children}</span>
      </Link>
    </li>
  );
}

function PagesSection({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const pages = useQuery({
    queryKey: ['block', 'listPages', workspaceId],
    queryFn: () => trpc.block.listPages.query({ workspaceId }),
  });

  const createPage = useMutation({
    mutationFn: () => trpc.block.createPage.mutate({ workspaceId, title: '無題' }),
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ['block', 'listPages', workspaceId] });
      await navigate({ to: '/p/$pageId', params: { pageId: row.id } });
    },
  });

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          ページ
        </span>
        <button
          type="button"
          onClick={() => createPage.mutate()}
          disabled={createPage.isPending}
          data-testid="sidebar-new-page"
          className="text-xs text-zinc-500 hover:text-violet-600 disabled:opacity-50 dark:hover:text-violet-300"
          title="新規ページ"
        >
          +
        </button>
      </div>
      <ul className="space-y-0.5">
        {(pages.data ?? []).slice(0, 12).map((p) => {
          const title =
            typeof p.props === 'object' && p.props && 'title' in p.props
              ? String((p.props as { title?: string }).title ?? '無題')
              : '無題';
          return (
            <li key={p.id}>
              <Link
                to="/p/$pageId"
                params={{ pageId: p.id }}
                data-testid={`sidebar-page-${p.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-zinc-200 dark:hover:bg-zinc-800"
              >
                <span className="w-4 text-center text-xs">📄</span>
                <span className="min-w-0 truncate text-sm">{title}</span>
              </Link>
            </li>
          );
        })}
        {pages.data && pages.data.length === 0 ? (
          <li className="px-2 text-xs text-zinc-500">まだページはありません</li>
        ) : null}
      </ul>
    </div>
  );
}
