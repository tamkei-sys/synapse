import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/settings/tokens')({
  component: TokensRoute,
});

function TokensRoute() {
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
          Sign in to manage API tokens
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

  return <TokensPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

type CreatedToken = Awaited<ReturnType<typeof trpc.apiToken.create.mutate>>;

function TokensPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const queryClient = useQueryClient();
  const list = useQuery({
    queryKey: ['apiToken', 'list', workspaceId],
    queryFn: () => trpc.apiToken.list.query({ workspaceId }),
  });

  const [label, setLabel] = useState('');
  const [justCreated, setJustCreated] = useState<CreatedToken | null>(null);

  const createMut = useMutation({
    mutationFn: (lbl: string) =>
      trpc.apiToken.create.mutate({ workspaceId, label: lbl, ttlDays: 30 }),
    onSuccess: async (row) => {
      setJustCreated(row);
      setLabel('');
      await queryClient.invalidateQueries({ queryKey: ['apiToken', 'list', workspaceId] });
    },
  });

  const revokeMut = useMutation({
    mutationFn: (tokenId: string) => trpc.apiToken.revoke.mutate({ tokenId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apiToken', 'list', workspaceId] }),
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API tokens · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Used by the SYNAPSE MCP server so Claude Code can read and write PBIs from the terminal.
          </p>
        </div>
        <Link to="/" className="text-sm text-zinc-500 hover:underline">
          ← back to workspace
        </Link>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          createMut.mutate(label.trim());
        }}
        className="mb-6 flex items-end gap-3"
      >
        <label className="flex-1">
          <span className="mb-1 block text-sm font-medium">New token label</span>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="cc on my laptop"
            data-testid="new-token-label"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          disabled={createMut.isPending || !label.trim()}
          data-testid="create-token-submit"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {createMut.isPending ? 'Creating…' : 'Create token'}
        </button>
      </form>

      {justCreated ? (
        <section
          data-testid="created-token"
          className="mb-6 rounded-lg border border-violet-300 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-950/40"
        >
          <p className="mb-2 text-sm font-medium">
            New token (copy it now — it won&apos;t be shown again):
          </p>
          <code
            data-testid="created-token-value"
            className="block break-all rounded bg-white px-3 py-2 font-mono text-xs dark:bg-zinc-900"
          >
            {justCreated.token}
          </code>
          <button
            type="button"
            onClick={() => setJustCreated(null)}
            className="mt-2 text-xs text-zinc-500 hover:underline"
          >
            I&apos;ve copied it — dismiss
          </button>
        </section>
      ) : null}

      {list.data && list.data.length > 0 ? (
        <ul
          data-testid="tokens-list"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        >
          {list.data.map((t) => {
            const isRevoked = !!t.revokedAt;
            const isExpired = t.expiresAt ? new Date(t.expiresAt).getTime() < Date.now() : false;
            return (
              <li
                key={t.id}
                data-testid={`token-row-${t.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="font-mono text-xs text-zinc-500">…{t.suffix}</p>
                  <p className="text-xs text-zinc-500">
                    created {new Date(t.createdAt).toLocaleString()}
                    {t.expiresAt
                      ? ` · expires ${new Date(t.expiresAt).toLocaleDateString()}`
                      : ' · never expires'}
                    {t.lastUsedAt ? ` · last used ${new Date(t.lastUsedAt).toLocaleString()}` : ''}
                  </p>
                </div>
                <div>
                  {isRevoked ? (
                    <span className="text-xs uppercase text-zinc-400">revoked</span>
                  ) : isExpired ? (
                    <span className="text-xs uppercase text-zinc-400">expired</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => revokeMut.mutate(t.id)}
                      disabled={revokeMut.isPending}
                      data-testid={`revoke-token-${t.id}`}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No tokens yet.
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
