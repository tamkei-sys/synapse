import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { SPRINT_STATUSES, type SprintStatus } from '@synapse/blocks';

import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/sprint')({
  component: SprintRoute,
});

type SprintRow = Awaited<ReturnType<typeof trpc.sprint.list.query>>[number];
type SprintPropsRead = {
  name: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  goal?: string;
  number?: number;
};

function readSprintProps(row: SprintRow): SprintPropsRead {
  const p = (row.props ?? {}) as Partial<SprintPropsRead>;
  return {
    name: p.name ?? 'Untitled',
    status: p.status ?? 'planning',
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
    ...(p.goal ? { goal: p.goal } : {}),
    ...(typeof p.number === 'number' ? { number: p.number } : {}),
  };
}

function SprintRoute() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  if (session.isPending || workspaces.isPending) return <Centered>Loading…</Centered>;
  if (!session.data)
    return (
      <Centered>
        <Link to="/login" className="text-violet-600 hover:underline">
          Sign in
        </Link>
      </Centered>
    );
  const workspace = workspaces.data?.[0];
  if (!workspace)
    return (
      <Centered>
        <Link to="/" className="text-violet-600 hover:underline">
          Create a workspace first
        </Link>
      </Centered>
    );
  return <SprintsPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function SprintsPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['sprint', 'list', workspaceId],
    queryFn: () => trpc.sprint.list.query({ workspaceId }),
  });
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: (n: string) => trpc.sprint.create.mutate({ workspaceId, name: n }),
    onSuccess: async () => {
      setName('');
      await qc.invalidateQueries({ queryKey: ['sprint', 'list', workspaceId] });
    },
  });
  const update = useMutation({
    mutationFn: (args: { sprintId: string; status: SprintStatus }) =>
      trpc.sprint.update.mutate({ sprintId: args.sprintId, patch: { status: args.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint', 'list', workspaceId] }),
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sprints · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← back to workspace
            </Link>
            {' · '}
            <span>2-week iterations</span>
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
            placeholder="Sprint name (e.g. 2026-W22)"
            data-testid="new-sprint-name"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={create.isPending || !name.trim()}
            data-testid="create-sprint-submit"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            Plan
          </button>
        </form>
      </header>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <ul
          data-testid="sprint-list"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        >
          {list.data.map((row) => {
            const s = readSprintProps(row);
            return (
              <li
                key={row.id}
                data-testid={`sprint-row-${row.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-zinc-400">SP-{s.number ?? '–'}</span>
                    <span className="text-sm font-medium" data-testid={`sprint-name-${row.id}`}>
                      {s.name}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-zinc-500">
                    {s.startDate} → {s.endDate}
                  </p>
                </div>
                <select
                  value={s.status}
                  onChange={(e) =>
                    update.mutate({
                      sprintId: row.id,
                      status: e.target.value as SprintStatus,
                    })
                  }
                  disabled={update.isPending}
                  data-testid={`sprint-status-${row.id}`}
                  className="rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {SPRINT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          No sprints planned yet.
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
