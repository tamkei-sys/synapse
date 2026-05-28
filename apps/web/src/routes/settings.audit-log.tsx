import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';

import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/settings/audit-log')({
  component: AuditRoute,
});

function AuditRoute() {
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
  return <AuditPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function AuditPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const list = useQuery({
    queryKey: ['audit', 'list', workspaceId],
    queryFn: () => trpc.audit.list.query({ workspaceId, limit: 50 }),
    refetchInterval: 5_000,
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit log · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Every MCP tool invocation appears here. Filter / export coming after the v1 cut.
          </p>
        </div>
        <Link to="/" className="text-sm text-zinc-500 hover:underline">
          ← back
        </Link>
      </header>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : list.data && list.data.length > 0 ? (
        <ul
          data-testid="audit-rows"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 font-mono text-xs dark:divide-zinc-800 dark:border-zinc-800"
        >
          {list.data.map((row) => (
            <li
              key={row.id}
              data-testid={`audit-row-${row.id}`}
              data-result={row.result}
              className="flex items-start gap-3 px-4 py-2"
            >
              <span className="w-44 shrink-0 text-zinc-500">
                {new Date(row.createdAt).toLocaleString()}
              </span>
              <span
                className={`w-12 shrink-0 rounded px-1.5 text-center ${
                  row.result === 'ok'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}
              >
                {row.result}
              </span>
              <span className="w-48 shrink-0 truncate">{row.tool}</span>
              <span className="flex-1 truncate text-zinc-500">
                {row.errorMessage ?? JSON.stringify(row.args ?? {})}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No audit entries yet. Wire an MCP token in{' '}
          <Link to="/settings/tokens">settings/tokens</Link> and run a cc tool.
        </p>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
