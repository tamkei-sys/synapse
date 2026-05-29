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
 *
 * Responsive (PBI-26)
 *   - md (>= 768px): 240px 固定の左サイドバー。常時表示。
 *   - mobile (< 768px): 通常は非表示。ui-store の `mobileSidebarOpen` が
 *     true のときだけ overlay として出る。背景に黒半透明 backdrop。
 *     - backdrop クリックで閉じる
 *     - Sidebar 内のナビをクリックしたら自動で閉じる
 *     - Esc キーで閉じる
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { useCurrentWorkspaceFromList } from '../../lib/current-workspace.js';
import { useT } from '../../lib/i18n.js';
import { trpc } from '../../lib/trpc.js';
import { useDismissOnEscape } from '../../lib/use-dismiss.js';
import { useUiStore } from '../../stores/ui-store.js';
import { UserMenu } from '../account/user-menu.js';
import { NotificationBell } from '../notifications/notification-bell.js';
import { WorkspaceSwitcher } from './workspace-switcher.js';

export function Sidebar() {
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });
  const current = useCurrentWorkspaceFromList(workspaces.data);
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const closeMobile = useUiStore((s) => s.closeMobileSidebar);
  const t = useT();
  useDismissOnEscape(mobileOpen, closeMobile);

  // モバイル幅で drawer が開いている間は body スクロールを止めて、
  // 背景がスワイプで動かないようにする。md 以上では常時 true なので無効化。
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  if (!current) return null;

  return (
    <>
      {/* モバイル時の backdrop。md 以上では非表示。 */}
      {mobileOpen ? (
        <button
          type="button"
          aria-label="サイドバーを閉じる"
          data-testid="sidebar-backdrop"
          onClick={closeMobile}
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden"
        />
      ) : null}
      <aside
        data-testid="sidebar"
        data-mobile-open={mobileOpen}
        className={`fixed inset-y-0 left-0 z-30 w-60 flex-col gap-3 border-r border-zinc-200 bg-zinc-50 px-3 py-4 text-sm transition-transform duration-200 ease-out md:z-20 md:flex md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-950 ${
          mobileOpen ? 'flex translate-x-0 shadow-2xl' : 'hidden -translate-x-full'
        }`}
      >
        <WorkspaceSwitcher current={current} />

        <div className="flex items-center justify-between rounded-md bg-white/40 px-2 py-1.5 dark:bg-zinc-900/40">
          <span className="text-xs text-zinc-500">{t('nav.searchHint')}</span>
          <NotificationBell workspaceId={current.id} />
        </div>

        <NavSection>
          <NavLink to="/" exact icon="🏠" onNavigate={closeMobile}>
            {t('nav.home')}
          </NavLink>
        </NavSection>

        <FavoritesSection workspaceId={current.id} onNavigate={closeMobile} />

        <NavSection title={t('nav.section.management')}>
          <NavLink to="/project" icon="📁" onNavigate={closeMobile}>
            {t('nav.projects')}
          </NavLink>
          <NavLink to="/sprint" icon="🏃" onNavigate={closeMobile}>
            {t('nav.sprints')}
          </NavLink>
          <NavLink to="/pbi" icon="✅" onNavigate={closeMobile}>
            {t('nav.pbi')}
          </NavLink>
          <NavLink to="/sbi" icon="🟢" onNavigate={closeMobile}>
            {t('nav.sbi')}
          </NavLink>
        </NavSection>

        <PagesSection workspaceId={current.id} onNavigate={closeMobile} />

        <NavSection title={t('nav.section.settings')}>
          <NavLink to="/settings/members" icon="👥" onNavigate={closeMobile}>
            {t('nav.members')}
          </NavLink>
          <NavLink to="/settings/tokens" icon="🔑" onNavigate={closeMobile}>
            {t('nav.tokens')}
          </NavLink>
          <NavLink to="/settings/audit-log" icon="📋" onNavigate={closeMobile}>
            {t('nav.audit')}
          </NavLink>
        </NavSection>

        <div className="mt-auto flex items-center justify-end rounded-md bg-white/40 px-2 py-1.5 dark:bg-zinc-900/40">
          <UserMenu placement="top" />
        </div>
      </aside>
    </>
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
  onNavigate,
}: {
  to: string;
  icon: string;
  exact?: boolean;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  const loc = useLocation();
  const active = exact ? loc.pathname === to : loc.pathname.startsWith(to);
  return (
    <li>
      <Link
        to={to}
        data-testid={`sidebar-link-${to}`}
        data-active={active}
        onClick={onNavigate}
        className={`flex min-h-11 items-center gap-2 rounded-md px-2 py-2 transition-colors ${
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

type PageRow = {
  id: string;
  parentId: string | null;
  position: string;
  props: unknown;
};

type PageNode = PageRow & { children: PageNode[] };

function buildPageTree(rows: readonly PageRow[]): PageNode[] {
  const byId = new Map<string, PageNode>();
  const roots: PageNode[] = [];
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  for (const r of rows) {
    const node = byId.get(r.id)!;
    if (r.parentId && byId.has(r.parentId)) {
      byId.get(r.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function getTitle(p: unknown): string {
  if (p && typeof p === 'object' && 'title' in p) {
    return String((p as { title?: string }).title ?? '無題');
  }
  return '無題';
}

function getIcon(p: unknown): string {
  if (p && typeof p === 'object' && 'icon' in p) {
    const v = (p as { icon?: string }).icon;
    if (typeof v === 'string' && v) return v;
  }
  return '📄';
}

function FavoritesSection({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const favs = useQuery({
    queryKey: ['favorite', 'listMine', workspaceId],
    queryFn: () => trpc.favorite.listMine.query({ workspaceId }),
  });
  if (!favs.data || favs.data.length === 0) return null;
  return (
    <div>
      <p className="mb-1 px-2 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
        お気に入り
      </p>
      <ul className="space-y-0.5">
        {favs.data.map((f) => (
          <li key={f.pageId}>
            <Link
              to="/p/$pageId"
              params={{ pageId: f.pageId }}
              data-testid={`sidebar-fav-${f.pageId}`}
              onClick={onNavigate}
              className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            >
              <span className="w-4 text-center text-xs">{f.icon || '⭐'}</span>
              <span className="min-w-0 truncate text-sm">{f.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PagesSection({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const t = useT();

  // ツリーを組むため、全 page を取る (PBI-34)。トップレベルだけの旧 listPages
  // は他の場所でも使われているので残してある。
  const pages = useQuery({
    queryKey: ['block', 'listAllPages', workspaceId],
    queryFn: () => trpc.block.listAllPages.query({ workspaceId }),
  });

  const createPage = useMutation({
    mutationFn: () => trpc.block.createPage.mutate({ workspaceId, title: '無題' }),
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ['block', 'listAllPages', workspaceId] });
      await qc.invalidateQueries({ queryKey: ['block', 'listPages', workspaceId] });
      onNavigate?.();
      await navigate({ to: '/p/$pageId', params: { pageId: row.id } });
    },
  });

  const tree = useMemo(() => buildPageTree(pages.data ?? []), [pages.data]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between px-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">
          {t('nav.section.pages')}
        </span>
        <button
          type="button"
          onClick={() => createPage.mutate()}
          disabled={createPage.isPending}
          data-testid="sidebar-new-page"
          className="flex h-7 w-7 items-center justify-center rounded text-base text-zinc-500 hover:bg-zinc-200 hover:text-violet-600 disabled:opacity-50 dark:hover:bg-zinc-800 dark:hover:text-violet-300"
          title={t('nav.newPage')}
          aria-label={t('nav.newPage')}
        >
          +
        </button>
      </div>
      <ul className="space-y-0.5">
        {tree.slice(0, 30).map((p) => (
          <PageTreeItem key={p.id} node={p} depth={0} onNavigate={onNavigate} />
        ))}
        {pages.data && pages.data.length === 0 ? (
          <li className="px-2 text-xs text-zinc-500">{t('nav.emptyPages')}</li>
        ) : null}
      </ul>
    </div>
  );
}

function PageTreeItem({
  node,
  depth,
  onNavigate,
}: {
  node: PageNode;
  depth: number;
  onNavigate?: () => void;
}) {
  // 親は閉じれば子が隠れる。デフォルト開く深さは 1 (Notion 同様)。
  const [open, setOpen] = useState(depth < 1);
  const hasChildren = node.children.length > 0;
  return (
    <li>
      <div
        className="group flex items-center gap-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800"
        style={{ paddingLeft: depth * 8 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            data-testid={`sidebar-tree-toggle-${node.id}`}
            aria-label={open ? '折りたたむ' : '展開する'}
            aria-expanded={open}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <Link
          to="/p/$pageId"
          params={{ pageId: node.id }}
          data-testid={`sidebar-page-${node.id}`}
          onClick={onNavigate}
          className="flex min-h-9 flex-1 items-center gap-2 rounded-md px-1 py-1.5"
        >
          <span className="w-4 text-center text-xs">{getIcon(node.props)}</span>
          <span className="min-w-0 truncate text-sm">{getTitle(node.props)}</span>
        </Link>
      </div>
      {open && hasChildren ? (
        <ul className="space-y-0.5">
          {node.children.map((c) => (
            <PageTreeItem key={c.id} node={c} depth={depth + 1} onNavigate={onNavigate} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
