import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import { PageEditor } from '../features/editor/editor.js';
import { EMPTY_DOC, type PageDoc } from '../features/editor/types.js';
import { useAutosave } from '../features/editor/use-autosave.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/p/$pageId')({
  component: PageView,
});

type PageProps = { title?: string; doc?: PageDoc };

function PageView() {
  const { pageId } = Route.useParams();
  const queryClient = useQueryClient();

  const pageQuery = useQuery({
    queryKey: ['block', 'getPage', pageId],
    queryFn: () => trpc.block.getPage.query({ pageId }),
  });

  if (pageQuery.isPending) {
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
  const title = props.title ?? 'Untitled';
  const doc = props.doc ?? EMPTY_DOC;

  return (
    <PageEditorShell
      pageId={page.id}
      initialTitle={title}
      initialDoc={doc}
      initialVersion={page.version}
      onSaved={(updatedVersion) => {
        // Mutate the query cache so optimistic version tracking stays
        // accurate without a refetch.
        queryClient.setQueryData(
          ['block', 'getPage', pageId],
          (prev: { page: typeof page } | undefined) =>
            prev ? { page: { ...prev.page, version: updatedVersion } } : prev,
        );
      }}
    />
  );
}

type ShellProps = {
  pageId: string;
  initialTitle: string;
  initialDoc: PageDoc;
  initialVersion: number;
  onSaved: (newVersion: number) => void;
};

function PageEditorShell({
  pageId,
  initialTitle,
  initialDoc,
  initialVersion,
  onSaved,
}: ShellProps) {
  const [title, setTitle] = useState(initialTitle);
  const [doc, setDoc] = useState<PageDoc>(initialDoc);
  const [version, setVersion] = useState(initialVersion);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [conflict, setConflict] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (payload: { title: string; doc: PageDoc; version: number }) =>
      trpc.block.updatePageContent.mutate({ pageId, ...payload }),
    onSuccess: (row) => {
      setVersion(row.version);
      setSavedAt(new Date());
      setConflict(false);
      onSaved(row.version);
    },
    onError: (e: Error) => {
      if (e.message.toLowerCase().includes('reload')) setConflict(true);
    },
  });

  const save = useCallback(
    (next: { title: string; doc: PageDoc }) => {
      saveMutation.mutate({ ...next, version });
    },
    [saveMutation, version],
  );

  // Autosave both title and doc as one combined value so they ship together.
  const { flush } = useAutosave({ title, doc }, save, 1_000);

  if (conflict) {
    return (
      <CenteredMessage>
        <p>This page has been updated elsewhere.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Reload
        </button>
      </CenteredMessage>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <nav className="mb-6 text-sm">
        <BackLink onClick={flush} />
      </nav>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={flush}
        data-testid="page-title-input"
        className="mb-2 w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
        placeholder="Untitled"
      />
      <p className="mb-8 font-mono text-xs text-zinc-400" data-testid="page-id">
        {pageId} · v{version}
        {savedAt ? (
          <span className="ml-2 text-zinc-500" data-testid="saved-indicator">
            saved {savedAt.toLocaleTimeString()}
          </span>
        ) : null}
        {saveMutation.isPending ? <span className="ml-2 text-zinc-500">saving…</span> : null}
      </p>

      <PageEditor initialDoc={doc} onDocChange={setDoc} />
    </div>
  );
}

function BackLink({ onClick }: { onClick?: () => void } = {}) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
    >
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
