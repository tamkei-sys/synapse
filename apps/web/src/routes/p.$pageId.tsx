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
    return <CenteredMessage>Loading page…</CenteredMessage>;
  }
  if (pageQuery.error) {
    return (
      <CenteredMessage>
        <p>Failed to load page: {pageQuery.error.message}</p>
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
      initialTitle={props.title ?? 'Untitled'}
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
  const { doc, status } = useCollabDoc(pageId, token);
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
        placeholder="Untitled"
      />
      <p className="mb-8 flex items-center gap-3 font-mono text-xs text-zinc-400">
        <span data-testid="page-id">{pageId}</span>
        <ConnectionBadge status={status} />
        {titleSavedAt ? (
          <span data-testid="title-saved" className="text-zinc-500">
            title saved {titleSavedAt.toLocaleTimeString()}
          </span>
        ) : null}
      </p>

      {doc ? (
        <PageEditor doc={doc} workspaceId={workspaceId} />
      ) : (
        <p className="text-zinc-500">Loading editor…</p>
      )}
    </div>
  );
}

function ConnectionBadge({ status }: { status: CollabStatus }) {
  const label =
    status === 'connected'
      ? 'live'
      : status === 'connecting'
        ? 'connecting…'
        : status === 'offline'
          ? 'offline'
          : 'disconnected';
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

function BackLink() {
  return (
    <Link to="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
      ← back to workspace
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
