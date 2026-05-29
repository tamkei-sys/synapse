/**
 * /db — ワークスペース内の user-defined DB 一覧 + 新規作成 (PBI-30)。
 *
 * Sidebar に置くほど主要動線ではないので、現時点では URL 直アクセスだけ。
 * 1 段落の説明 + 直近 50 件のカード + 新規作成フォーム。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/db')({
  component: DbIndex,
});

function DbIndex() {
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });
  const current = useCurrentWorkspaceFromList(workspaces.data);
  if (!current) {
    return <p className="mx-auto max-w-3xl px-6 py-12 text-zinc-500">読み込み中…</p>;
  }
  return <DbList workspaceId={current.id} />;
}

function DbList({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useQuery({
    queryKey: ['db', 'listForWorkspace', workspaceId],
    queryFn: () => trpc.db.listForWorkspace.query({ workspaceId }),
  });

  const [title, setTitle] = useState('');
  const create = useMutation({
    mutationFn: (t: string) => trpc.db.create.mutate({ workspaceId, title: t }),
    onSuccess: async (row) => {
      setTitle('');
      await qc.invalidateQueries({ queryKey: ['db', 'listForWorkspace', workspaceId] });
      await navigate({ to: '/b/$blockId', params: { blockId: row.id } });
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">データベース</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Notion 風の任意スキーマ DB。列を自由に追加して、行ごとに値を入れる。
          MVP は Table ビューのみ（Board / Gallery は後続 PBI）。
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = title.trim();
          if (!t) return;
          create.mutate(t);
        }}
        data-testid="db-create-form"
        className="mb-6 flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          placeholder="新しい DB の名前"
          data-testid="db-create-title"
          className="flex-1 rounded border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <button
          type="submit"
          disabled={create.isPending || !title.trim()}
          data-testid="db-create-submit"
          className="rounded bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          作成
        </button>
      </form>

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">一覧</h2>
        {list.isPending ? (
          <p className="text-sm text-zinc-500">読み込み中…</p>
        ) : list.data && list.data.length > 0 ? (
          <ul className="grid gap-2 sm:grid-cols-2">
            {list.data.map((d) => (
              <li key={d.id}>
                <Link
                  to="/b/$blockId"
                  params={{ blockId: d.id }}
                  data-testid={`db-list-item-${d.id}`}
                  className="block rounded-md border border-zinc-200 bg-white p-3 text-sm hover:border-violet-400 hover:bg-violet-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-600 dark:hover:bg-violet-900/20"
                >
                  <span className="block font-medium">📚 {d.title}</span>
                  <span className="mt-1 block text-xs text-zinc-500">
                    {new Date(d.createdAt).toLocaleString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">まだ DB はありません。</p>
        )}
      </section>
    </div>
  );
}
