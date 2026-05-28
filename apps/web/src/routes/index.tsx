import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const session = useSession();
  const user = session.data?.user;

  if (session.isPending) {
    return <Centered>Loading…</Centered>;
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
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to SYNAPSE</h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          A block-native workspace for docs, PBIs, and spreadsheets.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/login"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            Create account
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

  if (workspaces.isPending) {
    return <Centered>Loading workspaces…</Centered>;
  }

  if (workspaces.error) {
    return <Centered>Failed to load workspaces: {workspaces.error.message}</Centered>;
  }

  if (workspaces.data.length === 0) {
    return <CreateWorkspaceForm />;
  }

  const workspace = workspaces.data[0];
  if (!workspace) {
    return <Centered>No workspace found.</Centered>;
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
      setError('Name is required.');
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
          <h1 className="text-xl font-semibold tracking-tight">Create your first workspace</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Everything in SYNAPSE — pages, PBIs, sheets — lives inside a workspace.
          </p>
        </header>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Workspace name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My team"
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
          {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
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

  const createPage = useMutation({
    mutationFn: () =>
      trpc.block.createPage.mutate({ workspaceId: workspace.id, title: 'Untitled' }),
    onSuccess: async (page) => {
      await queryClient.invalidateQueries({ queryKey: ['block', 'listPages', workspace.id] });
      await navigate({ to: '/p/$pageId', params: { pageId: page.id } });
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="workspace-name">
            {workspace.name}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <code className="font-mono">{workspace.slug}</code> · signed in as {email}
          </p>
        </div>
        <button
          type="button"
          onClick={() => createPage.mutate()}
          disabled={createPage.isPending}
          data-testid="new-page-button"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {createPage.isPending ? 'Creating…' : 'New page'}
        </button>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">Pages</h2>
        {pages.isPending ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : pages.data && pages.data.length > 0 ? (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {pages.data.map((page) => (
              <PageListItem key={page.id} page={page} />
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
            No pages yet. Click <em>New page</em> to create your first one.
          </div>
        )}
      </section>
    </div>
  );
}

function PageListItem({ page }: { page: PageRow }) {
  const title =
    typeof page.props === 'object' && page.props && 'title' in page.props
      ? String(page.props['title'])
      : 'Untitled';

  return (
    <li>
      <Link
        to="/p/$pageId"
        params={{ pageId: page.id }}
        data-testid="page-list-item"
        className="block px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
      >
        <span className="font-medium">{title}</span>
        <span className="ml-2 font-mono text-xs text-zinc-400">{page.id.slice(-6)}</span>
      </Link>
    </li>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6">{children}</div>;
}
