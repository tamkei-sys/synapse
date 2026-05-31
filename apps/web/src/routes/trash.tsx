/**
 * ゴミ箱 (PBI-57)。soft-delete されたページの一覧。
 *
 * - 復元: deletedAt を外して元の場所（親が消えていればルート）へ戻す
 * - 完全に削除: 物理削除。取り返しがつかないので window.confirm で確認する
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/trash')({
  component: TrashRoute,
});

function TrashRoute() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  const workspace = useCurrentWorkspaceFromList(workspaces.data);
  if (session.isPending || workspaces.isPending) return <Centered>読み込み中…</Centered>;
  if (!session.data)
    return (
      <Centered>
        <Link to="/login" className="text-violet-600 hover:underline">
          ログイン
        </Link>
      </Centered>
    );
  if (!workspace)
    return (
      <Centered>
        <Link to="/" className="text-violet-600 hover:underline">
          まずはワークスペースを作成
        </Link>
      </Centered>
    );
  return <TrashPanel workspaceId={workspace.id} />;
}

function TrashPanel({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const trash = useQuery({
    queryKey: ['block', 'listTrash', workspaceId],
    queryFn: () => trpc.block.listTrash.query({ workspaceId }),
  });

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ['block', 'listTrash', workspaceId] });
    await qc.invalidateQueries({ queryKey: ['block', 'listAllPages', workspaceId] });
    await qc.invalidateQueries({ queryKey: ['favorite'] });
  };

  const restore = useMutation({
    mutationFn: (pageId: string) => trpc.block.restorePage.mutate({ pageId }),
    onSuccess: invalidate,
  });
  const purge = useMutation({
    mutationFn: (pageId: string) => trpc.block.purgePage.mutate({ pageId }),
    onSuccess: invalidate,
  });

  // バルク選択 (PBI-90)。チェックした行を一括で復元 / 完全削除する。
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const busy = restore.isPending || purge.isPending;
  const bulkRestore = async () => {
    const ids = [...selected];
    for (const id of ids) await restore.mutateAsync(id).catch(() => undefined);
    setSelected(new Set());
  };
  const bulkPurge = async () => {
    if (!window.confirm(`選択した ${selected.size} 件を完全に削除しますか？\nこの操作は取り消せません。`)) return;
    const ids = [...selected];
    for (const id of ids) await purge.mutateAsync(id).catch(() => undefined);
    setSelected(new Set());
  };

  return (
    <div className="w-full max-w-none px-6 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">🗑️ ゴミ箱</h1>
        <Link to="/" className="text-sm text-violet-600 hover:underline">
          ← ホームへ
        </Link>
      </div>

      {selected.size > 0 ? (
        <div
          data-testid="trash-bulk-bar"
          className="mb-3 flex items-center gap-3 rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-sm dark:border-violet-900/50 dark:bg-violet-900/20"
        >
          <span data-testid="trash-selected-count">{selected.size} 件選択中</span>
          <button
            type="button"
            onClick={bulkRestore}
            disabled={busy}
            data-testid="trash-bulk-restore"
            className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-white disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            選択を復元
          </button>
          <button
            type="button"
            onClick={bulkPurge}
            disabled={busy}
            data-testid="trash-bulk-purge"
            className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
          >
            選択を完全削除
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            選択解除
          </button>
        </div>
      ) : null}

      {trash.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : trash.error ? (
        <p className="text-sm text-red-500">読み込みに失敗しました。</p>
      ) : trash.data.length === 0 ? (
        <p
          data-testid="trash-empty"
          className="rounded-md border border-dashed border-zinc-300 px-3 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700"
        >
          ゴミ箱は空です
        </p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {trash.data.map((p) => (
            <li
              key={p.id}
              data-testid={`trash-item-${p.id}`}
              className="flex items-center gap-3 px-3 py-2.5"
            >
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
                data-testid={`trash-select-${p.id}`}
                aria-label={`${p.title} を選択`}
                className="h-4 w-4 shrink-0"
              />
              <span className="w-5 text-center">{p.icon || '📄'}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{p.title}</span>
              <button
                type="button"
                onClick={() => restore.mutate(p.id)}
                disabled={restore.isPending || purge.isPending}
                data-testid={`trash-restore-${p.id}`}
                className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                復元
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `「${p.title}」を完全に削除しますか？\nこの操作は取り消せません。サブページも一緒に削除されます。`,
                    )
                  ) {
                    purge.mutate(p.id);
                  }
                }}
                disabled={restore.isPending || purge.isPending}
                data-testid={`trash-purge-${p.id}`}
                className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/40"
              >
                完全に削除
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-sm text-zinc-500">
      <div>{children}</div>
    </div>
  );
}
