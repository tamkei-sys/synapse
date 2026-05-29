import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { PageEditor } from '../features/editor/editor.js';
import { useCollabDoc, type CollabStatus } from '../features/editor/use-collab-doc.js';
import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/p/$pageId')({
  component: PageView,
});

type PageProps = { title?: string };

function PageView() {
  const { pageId } = Route.useParams();
  const session = useSession();
  const token = session.data?.session.token;

  const pageQuery = useQuery({
    queryKey: ['block', 'getPage', pageId],
    queryFn: () => trpc.block.getPage.query({ pageId }),
  });

  if (pageQuery.isPending || session.isPending) {
    return <CenteredMessage>ページを読み込み中…</CenteredMessage>;
  }
  if (pageQuery.error) {
    return (
      <CenteredMessage>
        <p>ページの取得に失敗：{pageQuery.error.message}</p>
        <p className="mt-4">
          <BackLink />
        </p>
      </CenteredMessage>
    );
  }

  const { page } = pageQuery.data;
  const props = (page.props ?? {}) as PageProps;
  return (
    <PageShell
      pageId={page.id}
      workspaceId={page.workspaceId}
      initialTitle={props.title ?? '無題'}
      token={token}
    />
  );
}

type ShellProps = {
  pageId: string;
  workspaceId: string;
  initialTitle: string;
  token: string | undefined;
};

function PageShell({ pageId, workspaceId, initialTitle, token }: ShellProps) {
  const { doc, status } = useCollabDoc(`page:${pageId}`, token);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initialTitle);
  const [titleSavedAt, setTitleSavedAt] = useState<Date | null>(null);

  // Title still lives in `block.props.title`; the editor body is owned by
  // Yjs. Persist title via the existing tRPC endpoint on blur.
  const updateTitle = useMutation({
    mutationFn: (newTitle: string) =>
      trpc.block.updatePageTitle.mutate({ pageId, title: newTitle }),
    onSuccess: () => {
      setTitleSavedAt(new Date());
      void queryClient.invalidateQueries({ queryKey: ['block', 'listPages'] });
    },
  });

  // Keep local title in sync if the server snapshot updates beneath us.
  useEffect(() => setTitle(initialTitle), [initialTitle]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <Breadcrumb pageId={pageId} />
      <nav className="mb-6 text-sm">
        <BackLink />
      </nav>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title.trim().length > 0 && title !== initialTitle) {
            updateTitle.mutate(title.trim());
          }
        }}
        data-testid="page-title-input"
        className="mb-2 w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
        placeholder="無題"
      />
      <p className="mb-8 flex items-center gap-3 font-mono text-xs text-zinc-400">
        <span data-testid="page-id">{pageId}</span>
        <ConnectionBadge status={status} />
        {titleSavedAt ? (
          <span data-testid="title-saved" className="text-zinc-500">
            タイトル保存 {titleSavedAt.toLocaleTimeString('ja-JP')}
          </span>
        ) : null}
      </p>

      {doc ? (
        <PageEditor doc={doc} workspaceId={workspaceId} parentPageId={pageId} />
      ) : (
        <p className="text-zinc-500">エディタを準備中…</p>
      )}

      <ChildPagesSection pageId={pageId} />
    </div>
  );
}

function ChildPagesSection({ pageId }: { pageId: string }) {
  const children = useQuery({
    queryKey: ['block', 'listChildPages', pageId],
    queryFn: () => trpc.block.listChildPages.query({ parentPageId: pageId }),
  });
  if (children.isPending) return null;
  if (!children.data || children.data.length === 0) return null;
  return (
    <section className="mt-10" data-testid="child-pages-section">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        子ページ
      </h2>
      <ul className="space-y-1">
        {children.data.map((c) => {
          const title =
            (c.props as { title?: string } | null | undefined)?.title ?? '無題';
          return (
            <li key={c.id}>
              <Link
                to="/p/$pageId"
                params={{ pageId: c.id }}
                data-testid={`child-page-${c.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span aria-hidden>📄</span>
                <span className="font-medium">{title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ConnectionBadge({ status }: { status: CollabStatus }) {
  const label =
    status === 'connected'
      ? '同期中'
      : status === 'connecting'
        ? '接続中…'
        : status === 'offline'
          ? 'オフライン'
          : '切断';
  const tone =
    status === 'connected'
      ? 'bg-emerald-500'
      : status === 'connecting'
        ? 'bg-amber-500'
        : 'bg-zinc-400';
  return (
    <span
      data-testid="connection-status"
      data-status={status}
      className="inline-flex items-center gap-1.5"
    >
      <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function Breadcrumb({ pageId }: { pageId: string }) {
  // 親ページのチェーン。/p/$pageId にいるときだけ表示する。
  const trail = useQuery({
    queryKey: ['block', 'getPageBreadcrumb', pageId],
    queryFn: () => trpc.block.getPageBreadcrumb.query({ pageId }),
  });
  if (trail.isPending || !trail.data || trail.data.length <= 1) return null;
  // 最後の要素 = 自分なので、それより前だけリンク
  const ancestors = trail.data.slice(0, -1);
  return (
    <nav
      aria-label="パンくず"
      data-testid="page-breadcrumb"
      className="mb-2 flex flex-wrap items-center gap-1 text-xs text-zinc-500"
    >
      {ancestors.map((a, i) => (
        <span key={a.id} className="flex items-center gap-1">
          {i > 0 ? <span aria-hidden>›</span> : null}
          <Link
            to="/p/$pageId"
            params={{ pageId: a.id }}
            data-testid={`breadcrumb-${a.id}`}
            className="rounded px-1 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            📄 {a.title}
          </Link>
        </span>
      ))}
      <span aria-hidden>›</span>
      <span className="text-zinc-400">現在のページ</span>
    </nav>
  );
}

function BackLink() {
  return (
    <Link to="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
      ← ワークスペースに戻る
    </Link>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <div>{children}</div>
    </div>
  );
}
