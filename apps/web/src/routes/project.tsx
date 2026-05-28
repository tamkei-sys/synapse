import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { PROJECT_STATUSES, type Priority, type ProjectStatus } from '@synapse/blocks';

import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/project')({
  component: ProjectRoute,
});

type ProjectRow = Awaited<ReturnType<typeof trpc.project.list.query>>[number];
type ProjectPropsRead = {
  name: string;
  status: ProjectStatus;
  priority: Priority;
  number?: number;
  startDate?: string;
  plannedDate?: string;
};

function readProjectProps(row: ProjectRow): ProjectPropsRead {
  const p = (row.props ?? {}) as Partial<ProjectPropsRead>;
  return {
    name: p.name ?? 'Untitled',
    status: p.status ?? 'backlog',
    priority: p.priority ?? 'should',
    ...(typeof p.number === 'number' ? { number: p.number } : {}),
    ...(p.startDate ? { startDate: p.startDate } : {}),
    ...(p.plannedDate ? { plannedDate: p.plannedDate } : {}),
  };
}

function ProjectRoute() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  if (session.isPending || workspaces.isPending) {
    return <Centered>Loading…</Centered>;
  }
  if (!session.data) {
    return (
      <Centered>
        <Link to="/login" className="text-violet-600 hover:underline">
          Sign in
        </Link>
      </Centered>
    );
  }
  const workspace = workspaces.data?.[0];
  if (!workspace) {
    return (
      <Centered>
        <Link to="/" className="text-violet-600 hover:underline">
          Create a workspace first
        </Link>
      </Centered>
    );
  }
  return <ProjectsPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function ProjectsPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['project', 'list', workspaceId],
    queryFn: () => trpc.project.list.query({ workspaceId }),
  });
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: (newName: string) => trpc.project.create.mutate({ workspaceId, name: newName }),
    onSuccess: async () => {
      setName('');
      await qc.invalidateQueries({ queryKey: ['project', 'list', workspaceId] });
    },
  });
  const update = useMutation({
    mutationFn: (args: { projectId: string; status: ProjectStatus }) =>
      trpc.project.update.mutate({ projectId: args.projectId, patch: { status: args.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', 'list', workspaceId] }),
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← back to workspace
            </Link>
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate(name.trim());
          }}
          className="flex items-center gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            data-testid="new-project-name"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={create.isPending || !name.trim()}
            data-testid="create-project-submit"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            Add
          </button>
        </form>
      </header>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <ul
          data-testid="project-list"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        >
          {list.data.map((row) => {
            const p = readProjectProps(row);
            return (
              <li
                key={row.id}
                data-testid={`project-row-${row.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-400">PRJ-{p.number ?? '–'}</span>
                  <span className="text-sm font-medium" data-testid={`project-name-${row.id}`}>
                    {p.name}
                  </span>
                  <PriorityChip priority={p.priority} />
                </div>
                <select
                  value={p.status}
                  onChange={(e) =>
                    update.mutate({ projectId: row.id, status: e.target.value as ProjectStatus })
                  }
                  disabled={update.isPending}
                  data-testid={`project-status-${row.id}`}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          No projects yet. Add one above.
        </div>
      )}
    </div>
  );
}

function PriorityChip({ priority }: { priority: Priority }) {
  const tone =
    priority === 'must'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : priority === 'should'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
        : priority === 'could'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
          : 'bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-400';
  return (
    <span className={`inline-block rounded px-1.5 font-mono text-xs ${tone}`}>{priority}</span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
