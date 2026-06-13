/**
 * ワークスペースのトップページ。
 *
 * 認証済みであればワークスペースの主要ナビ（プロジェクト・スプリント・
 * PBI・SBI・トークン）と最近のページ一覧を表示する。ワークスペースが
 * 1 つも無ければ新規作成フォームに切り替わる。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const user = session.data?.user;

  if (session.isPending) {
    return <Centered>読み込み中…</Centered>;
  }

  if (!user) {
    return <UnauthenticatedHome />;
  }

  return <AuthenticatedHome />;
}

function UnauthenticatedHome() {
  return (
    <Centered>
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">SYNAPSE へようこそ</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          ドキュメント・PBI・スプレッドシートを Block で統一したワークスペース。
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            ログイン
          </Link>
          <Link
            to="/signup"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            新規登録
          </Link>
        </div>
      </div>
    </Centered>
  );
}

function AuthenticatedHome() {
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });
  const workspace = useCurrentWorkspaceFromList(workspaces.data);

  if (workspaces.isPending) {
    return <Centered>ワークスペースを読み込み中…</Centered>;
  }

  if (workspaces.error) {
    return <Centered>ワークスペースの取得に失敗：{workspaces.error.message}</Centered>;
  }

  if (workspaces.data.length === 0) {
    return <CreateWorkspaceForm />;
  }

  if (!workspace) {
    return <Centered>ワークスペースが見つかりません。</Centered>;
  }

  return <WorkspaceHome workspace={workspace} />;
}

function CreateWorkspaceForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const createWorkspace = useMutation({
    mutationFn: (workspaceName: string) => trpc.workspace.create.mutate({ name: workspaceName }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['workspace', 'listMine'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError('名前は必須です。');
      return;
    }
    createWorkspace.mutate(name.trim());
  }

  return (
    <Centered>
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">最初のワークスペースを作る</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            SYNAPSE のあらゆるもの（ページ・PBI・シート）はワークスペースの中で動きます。
          </p>
        </header>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">ワークスペース名</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="チーム名・プロダクト名など"
            required
            data-testid="workspace-name-input"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : null}
        <button
          type="submit"
          disabled={createWorkspace.isPending}
          data-testid="create-workspace-submit"
          className="w-full rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {createWorkspace.isPending ? '作成中…' : 'ワークスペースを作成'}
        </button>
      </form>
    </Centered>
  );
}

type WorkspaceRow = Awaited<ReturnType<typeof trpc.workspace.listMine.query>>[number];
type PageRow = Awaited<ReturnType<typeof trpc.block.listPages.query>>[number];

function WorkspaceHome({ workspace }: { workspace: WorkspaceRow }) {
  const session = useSession();
  const email = session.data?.user.email;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const pages = useQuery({
    queryKey: ['block', 'listPages', workspace.id],
    queryFn: () => trpc.block.listPages.query({ workspaceId: workspace.id }),
  });
  const pbis = useQuery({
    queryKey: ['pbi', 'list', workspace.id],
    queryFn: () => trpc.pbi.list.query({ workspaceId: workspace.id }),
  });
  const unread = useQuery({
    queryKey: ['notification', 'unreadCount', workspace.id],
    queryFn: () => trpc.notification.unreadCount.query({ workspaceId: workspace.id }),
  });

  const createPage = useMutation({
    mutationFn: () => trpc.block.createPage.mutate({ workspaceId: workspace.id, title: '無題' }),
    onSuccess: async (page) => {
      await queryClient.invalidateQueries({ queryKey: ['block', 'listPages', workspace.id] });
      await navigate({ to: '/p/$pageId', params: { pageId: page.id } });
    },
  });

  return (
    <div className="w-full max-w-none px-6 py-12">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="workspace-name">
            {workspace.name}
          </h1>
          <p className="break-all text-sm text-zinc-500 dark:text-zinc-400">
            <code className="font-mono">{workspace.slug}</code> · ログイン中：{email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => createPage.mutate()}
          disabled={createPage.isPending}
          data-testid="new-page-button"
          className="shrink-0 whitespace-nowrap rounded-md bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {createPage.isPending ? '作成中…' : '+ 新規ページ'}
        </button>
      </header>

      <section className="mb-8 grid gap-4 sm:grid-cols-3" data-testid="dashboard-cards">
        <DashboardCard title="期限間近の PBI" testid="card-due">
          <DuePbiList pbis={pbis.data ?? []} />
        </DashboardCard>
        <DashboardCard title="未読通知" testid="card-unread">
          <p className="flex h-full items-center justify-center text-3xl font-semibold text-violet-600 dark:text-violet-300">
            {unread.data?.count ?? 0}
            <span className="ml-1 self-end pb-1 text-sm text-zinc-400">件</span>
          </p>
        </DashboardCard>
        <DashboardCard title="PBI ステータス" testid="card-pbi-summary">
          <PbiSummary pbis={pbis.data ?? []} />
        </DashboardCard>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">ページ</h2>
        {pages.isPending ? (
          <p className="text-sm text-zinc-500">読み込み中…</p>
        ) : pages.data && pages.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {pages.data.map((page) => (
              <PageListItem key={page.id} page={page} />
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
            ページはまだありません。<em>+ 新規ページ</em> から最初の 1 ページを作りましょう。
          </div>
        )}
      </section>
    </div>
  );
}

// ── ダッシュボード (PBI-81) ──────────────────────────────────

function DashboardCard({
  title,
  testid,
  children,
}: {
  title: string;
  testid: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-testid={testid}
      className="flex min-h-28 flex-col rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">{title}</h3>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

type DashPbi = { id: string; props?: unknown };

/** 期限(dueDate)のある PBI を近い順に最大 5 件。 */
function DuePbiList({ pbis }: { pbis: readonly DashPbi[] }) {
  const dated = pbis
    .map((p) => ({ id: p.id, props: (p.props ?? {}) as { title?: string; dueDate?: string } }))
    .filter((x): x is { id: string; props: { title?: string; dueDate: string } } =>
      Boolean(x.props.dueDate),
    )
    .sort((a, b) => a.props.dueDate.localeCompare(b.props.dueDate))
    .slice(0, 5);
  if (dated.length === 0) {
    return <p className="text-sm text-zinc-400">期限付きの PBI はありません。</p>;
  }
  return (
    <ul className="space-y-1">
      {dated.map((p) => (
        <li key={p.id}>
          <Link
            to="/b/$blockId"
            params={{ blockId: p.id }}
            className="flex items-center justify-between gap-2 text-sm hover:underline"
          >
            <span className="min-w-0 truncate">{p.props.title ?? '無題'}</span>
            <span className="shrink-0 font-mono text-xs text-zinc-400">{p.props.dueDate}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** PBI のステータス別件数サマリ。 */
function PbiSummary({ pbis }: { pbis: readonly DashPbi[] }) {
  const counts = new Map<string, number>();
  for (const p of pbis) {
    const s = ((p.props ?? {}) as { status?: string }).status ?? 'backlog';
    counts.set(s, (counts.get(s) ?? 0) + 1);
  }
  if (pbis.length === 0) {
    return <p className="text-sm text-zinc-400">PBI はまだありません。</p>;
  }
  return (
    <Link to="/pbi" className="block">
      <p className="text-2xl font-semibold">{pbis.length}</p>
      <p className="mt-1 text-xs text-zinc-500">
        進行中 {counts.get('in_progress') ?? 0} · 完了 {counts.get('done') ?? 0}
      </p>
    </Link>
  );
}

function PageListItem({ page }: { page: PageRow }) {
  const title =
    typeof page.props === 'object' && page.props && 'title' in page.props
      ? String(page.props['title'])
      : '無題';

  return (
    <li>
      <Link
        to="/p/$pageId"
        params={{ pageId: page.id }}
        data-testid="page-list-item"
        className="block px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <span className="font-medium">{title}</span>
      </Link>
    </li>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6">{children}</div>;
}
