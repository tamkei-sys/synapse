import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
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

  // Hooks は条件分岐 / early return より前にまとめて呼ぶ（Rules of Hooks）。
  const workspace = useCurrentWorkspaceFromList(workspaces.data);
  if (session.isPending || workspaces.isPending) {
    return <Centered>読み込み中…</Centered>;
  }
  if (!session.data) {
    return (
      <Centered>
        <Link to="/login" className="text-violet-600 hover:underline">
          ログインして API トークンを管理
        </Link>
      </Centered>
    );
  }
  if (!workspace) {
    return (
      <Centered>
        <Link to="/" className="text-violet-600 hover:underline">
          まずはワークスペースを作成
        </Link>
      </Centered>
    );
  }

  return <TokensPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

type CreatedToken = Awaited<ReturnType<typeof trpc.apiToken.create.mutate>>;

type Scope = 'read' | 'write_pbi' | 'write_comment' | 'admin';
const SCOPE_OPTIONS: Array<{ value: Scope; label: string; help: string }> = [
  { value: 'read', label: '読み取り', help: 'PBI / SBI / コメントの参照のみ' },
  { value: 'write_pbi', label: 'PBI 書き込み', help: 'PBI 作成・更新・ステータス変更' },
  { value: 'write_comment', label: 'コメント書き込み', help: 'コメント投稿 / 削除 / リアクション' },
  { value: 'admin', label: '管理者', help: '全権限。トークン発行や監査ログの参照を含む' },
];

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
  const [scopes, setScopes] = useState<Scope[]>(['read']);
  const [justCreated, setJustCreated] = useState<CreatedToken | null>(null);

  const createMut = useMutation({
    mutationFn: (lbl: string) =>
      trpc.apiToken.create.mutate({ workspaceId, label: lbl, ttlDays: 30, scopes }),
    onSuccess: async (row) => {
      setJustCreated(row);
      setLabel('');
      setScopes(['read']);
      await queryClient.invalidateQueries({ queryKey: ['apiToken', 'list', workspaceId] });
    },
  });
  const toggleScope = (s: Scope) =>
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const revokeMut = useMutation({
    mutationFn: (tokenId: string) => trpc.apiToken.revoke.mutate({ tokenId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['apiToken', 'list', workspaceId] }),
  });

  return (
    <div className="w-full max-w-none px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">API トークン · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            SYNAPSE MCP サーバーから Claude Code が PBI を読み書きする際に使うトークンです。
          </p>
        </div>
        <Link to="/" className="text-sm text-zinc-500 hover:underline">
          ← ワークスペースに戻る
        </Link>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim() || scopes.length === 0) return;
          createMut.mutate(label.trim());
        }}
        className="mb-6 space-y-3 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
      >
        <div className="flex items-end gap-3">
          <label className="flex-1">
            <span className="mb-1 block text-sm font-medium">新しいトークンのラベル</span>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例：自分のラップトップ用 cc"
              data-testid="new-token-label"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
          <button
            type="submit"
            disabled={createMut.isPending || !label.trim() || scopes.length === 0}
            data-testid="create-token-submit"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            {createMut.isPending ? '作成中…' : 'トークンを作成'}
          </button>
        </div>
        <fieldset className="space-y-1 text-sm">
          <legend className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            権限スコープ
          </legend>
          {SCOPE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-2"
              data-testid={`scope-${opt.value}`}
            >
              <input
                type="checkbox"
                checked={scopes.includes(opt.value)}
                onChange={() => toggleScope(opt.value)}
              />
              <span>
                <span className="font-medium">{opt.label}</span>
                <span className="ml-2 text-xs text-zinc-500">{opt.help}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </form>

      {justCreated ? (
        <section
          data-testid="created-token"
          className="mb-6 rounded-lg border border-violet-300 bg-violet-50 p-4 dark:border-violet-700 dark:bg-violet-950/40"
        >
          <p className="mb-2 text-sm font-medium">
            新しいトークンです。今コピーしてください（二度と表示されません）：
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
            コピー済み — 閉じる
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
                  {t.scopes && t.scopes.length > 0 ? (
                    <p className="mt-1 flex flex-wrap items-center gap-1">
                      {t.scopes.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-zinc-100 px-1.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        >
                          {s}
                        </span>
                      ))}
                    </p>
                  ) : null}
                  <p className="text-xs text-zinc-500">
                    作成 {new Date(t.createdAt).toLocaleString('ja-JP')}
                    {t.expiresAt
                      ? ` · 失効 ${new Date(t.expiresAt).toLocaleDateString('ja-JP')}`
                      : ' · 失効なし'}
                    {t.lastUsedAt
                      ? ` · 最終使用 ${new Date(t.lastUsedAt).toLocaleString('ja-JP')}`
                      : ''}
                  </p>
                </div>
                <div>
                  {isRevoked ? (
                    <span className="text-xs uppercase text-zinc-400">無効化済み</span>
                  ) : isExpired ? (
                    <span className="text-xs uppercase text-zinc-400">失効済み</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => revokeMut.mutate(t.id)}
                      disabled={revokeMut.isPending}
                      data-testid={`revoke-token-${t.id}`}
                      className="rounded-md border border-zinc-300 px-3 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      無効化
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
          まだトークンはありません。
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
