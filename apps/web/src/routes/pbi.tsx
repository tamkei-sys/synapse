import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { nextStatus, PBI_STATUS_ORDER, type PbiStatus } from '@synapse/blocks';

import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/pbi')({
  component: PbiBoardRoute,
});

type ViewMode = 'backlog' | 'kanban';

function PbiBoardRoute() {
  const session = useSession();

  // The board scopes to the user's first workspace — matches what the
  // dashboard route already assumes for S4. Multi-workspace switching
  // arrives with the sidebar in S5+.
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
          Sign in to see your PBIs
        </Link>
      </Centered>
    );
  }

  const workspace = workspaces.data?.[0];
  if (!workspace) {
    return (
      <Centered>
        <p>No workspace yet.</p>
        <p className="mt-2">
          <Link to="/" className="text-violet-600 hover:underline">
            ← go create one
          </Link>
        </p>
      </Centered>
    );
  }

  return <PbiBoard workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function PbiBoard({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [view, setView] = useState<ViewMode>('backlog');

  const list = useQuery({
    queryKey: ['pbi', 'list', workspaceId],
    queryFn: () => trpc.pbi.list.query({ workspaceId }),
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PBIs · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← back to workspace
            </Link>
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </header>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        view === 'backlog' ? (
          <BacklogTable items={list.data} workspaceId={workspaceId} />
        ) : (
          <KanbanBoard items={list.data} workspaceId={workspaceId} />
        )
      ) : (
        <Empty />
      )}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div
      role="tablist"
      data-testid="view-toggle"
      className="inline-flex rounded-md border border-zinc-300 bg-zinc-50 p-0.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {(['backlog', 'kanban'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          data-testid={`view-${v}`}
          onClick={() => onChange(v)}
          className={`rounded px-3 py-1 capitalize ${
            value === v
              ? 'bg-white shadow-sm dark:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

type PbiRow = Awaited<ReturnType<typeof trpc.pbi.list.query>>[number];

function readPbiProps(row: PbiRow): { title: string; status: PbiStatus; storyPoints?: number } {
  const p = (row.props ?? {}) as { title?: string; status?: PbiStatus; storyPoints?: number };
  return {
    title: p.title ?? 'Untitled',
    status: p.status ?? 'backlog',
    ...(typeof p.storyPoints === 'number' ? { storyPoints: p.storyPoints } : {}),
  };
}

function usePbiUpdate(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { pbiId: string; status: PbiStatus }) =>
      trpc.pbi.update.mutate({ pbiId: args.pbiId, patch: { status: args.status } }),
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ['pbi', 'list', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['pbi', 'get', row.id] });
    },
  });
}

function BacklogTable({ items, workspaceId }: { items: PbiRow[]; workspaceId: string }) {
  const update = usePbiUpdate(workspaceId);
  return (
    <ul
      data-testid="pbi-backlog"
      className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
    >
      {items.map((row) => {
        const p = readPbiProps(row);
        return (
          <li key={row.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-zinc-400">{row.id.slice(-6)}</span>
              <span className="text-sm font-medium" data-testid={`pbi-title-${row.id}`}>
                {p.title}
              </span>
              {typeof p.storyPoints === 'number' ? (
                <span className="text-xs text-zinc-500">{p.storyPoints} sp</span>
              ) : null}
            </div>
            <StatusButton
              status={p.status}
              pbiId={row.id}
              onClick={() => update.mutate({ pbiId: row.id, status: nextStatus(p.status) })}
              disabled={update.isPending}
            />
          </li>
        );
      })}
    </ul>
  );
}

function KanbanBoard({ items, workspaceId }: { items: PbiRow[]; workspaceId: string }) {
  const update = usePbiUpdate(workspaceId);
  const byStatus = new Map<PbiStatus, PbiRow[]>(PBI_STATUS_ORDER.map((s) => [s, []]));
  for (const row of items) {
    const p = readPbiProps(row);
    byStatus.get(p.status)?.push(row);
  }

  return (
    <div
      data-testid="pbi-kanban"
      className="grid gap-4 overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${PBI_STATUS_ORDER.length}, minmax(220px, 1fr))` }}
    >
      {PBI_STATUS_ORDER.map((status) => {
        const cards = byStatus.get(status) ?? [];
        return (
          <section
            key={status}
            data-testid={`kanban-column-${status}`}
            className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
          >
            <header className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span>{status.replace(/_/g, ' ')}</span>
              <span>{cards.length}</span>
            </header>
            <ul className="space-y-2">
              {cards.map((row) => {
                const p = readPbiProps(row);
                return (
                  <li
                    key={row.id}
                    data-testid={`kanban-card-${row.id}`}
                    className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <p className="mb-2 font-medium">{p.title}</p>
                    <StatusButton
                      status={p.status}
                      pbiId={row.id}
                      onClick={() => update.mutate({ pbiId: row.id, status: nextStatus(p.status) })}
                      disabled={update.isPending}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function StatusButton({
  status,
  pbiId,
  onClick,
  disabled,
}: {
  status: PbiStatus;
  pbiId: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={`pbi-status-${pbiId}`}
      data-status={status}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2 py-1 font-mono text-xs uppercase tracking-wide hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
    >
      {status}
    </button>
  );
}

function Empty() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
      No PBIs yet. Type <code className="font-mono">/pbi</code> in any page to create one.
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
