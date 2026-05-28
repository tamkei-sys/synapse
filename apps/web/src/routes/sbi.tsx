import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';

import {
  SBI_STATUSES,
  SBI_STATUS_ORDER,
  isOverEstimate,
  isStale,
  nextSbiStatus,
  type SbiStatus,
} from '@synapse/blocks';

import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/sbi')({
  component: SbiRoute,
});

type SbiRow = Awaited<ReturnType<typeof trpc.sbi.listForWorkspace.query>>[number];
type SbiPropsRead = {
  title: string;
  status: SbiStatus;
  estimateHours?: number;
  actualHours?: number;
  startedAt?: string;
  pbiId: string;
  number?: number;
};

function readSbiProps(row: SbiRow): SbiPropsRead {
  const p = (row.props ?? {}) as Partial<SbiPropsRead>;
  return {
    title: p.title ?? 'Untitled',
    status: p.status ?? 'todo',
    ...(typeof p.estimateHours === 'number' ? { estimateHours: p.estimateHours } : {}),
    ...(typeof p.actualHours === 'number' ? { actualHours: p.actualHours } : {}),
    ...(p.startedAt ? { startedAt: p.startedAt } : {}),
    pbiId: p.pbiId ?? '',
    ...(typeof p.number === 'number' ? { number: p.number } : {}),
  };
}

function SbiRoute() {
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
  return <SbiPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function SbiPanel({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['sbi', 'listForWorkspace', workspaceId],
    queryFn: () => trpc.sbi.listForWorkspace.query({ workspaceId }),
  });
  const cycle = useMutation({
    mutationFn: (args: { sbiId: string; status: SbiStatus }) => trpc.sbi.cycleStatus.mutate(args),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sbi', 'listForWorkspace', workspaceId] }),
  });

  const byStatus = new Map<SbiStatus, SbiRow[]>(SBI_STATUS_ORDER.map((s) => [s, []]));
  for (const row of list.data ?? []) {
    const p = readSbiProps(row);
    byStatus.get(p.status)?.push(row);
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SBI Board · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← back to workspace
            </Link>
            {' · '}
            Create SBIs under a PBI via{' '}
            <Link to="/pbi" className="text-violet-600 hover:underline">
              the PBI board
            </Link>
          </p>
        </div>
      </header>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <div
          data-testid="sbi-kanban"
          className="grid gap-3 overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${SBI_STATUS_ORDER.length}, minmax(220px, 1fr))` }}
        >
          {SBI_STATUS_ORDER.map((status) => {
            const cards = byStatus.get(status) ?? [];
            return (
              <section
                key={status}
                data-testid={`sbi-column-${status}`}
                className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
              >
                <header className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <span>{status.replace('_', ' ')}</span>
                  <span>{cards.length}</span>
                </header>
                <ul className="space-y-2">
                  {cards.map((row) => {
                    const p = readSbiProps(row);
                    const over = isOverEstimate(p);
                    const stale = isStale(p);
                    return (
                      <li
                        key={row.id}
                        data-testid={`sbi-card-${row.id}`}
                        className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <p className="mb-1 font-mono text-xs text-zinc-400">
                          SBI-{p.number ?? '–'}
                        </p>
                        <p className="mb-2 font-medium">{p.title}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {typeof p.estimateHours === 'number' ? (
                            <span className="text-zinc-500">est {p.estimateHours}h</span>
                          ) : null}
                          {typeof p.actualHours === 'number' ? (
                            <span className="text-zinc-500">act {p.actualHours}h</span>
                          ) : null}
                          {over ? (
                            <span
                              data-testid={`sbi-over-${row.id}`}
                              className="rounded bg-amber-100 px-1 font-mono text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            >
                              over!
                            </span>
                          ) : null}
                          {stale ? (
                            <span
                              data-testid={`sbi-stale-${row.id}`}
                              className="rounded bg-red-100 px-1 font-mono text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            >
                              stale
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              cycle.mutate({
                                sbiId: row.id,
                                status: nextSbiStatus(p.status),
                              })
                            }
                            disabled={cycle.isPending}
                            data-testid={`sbi-cycle-${row.id}`}
                            className="rounded border border-zinc-300 px-2 py-0.5 font-mono text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            → {nextSbiStatus(p.status)}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-zinc-500">Statuses available: {SBI_STATUSES.join(' / ')}</p>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
