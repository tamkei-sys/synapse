/**
 * /search — 全文検索ページ (PBI-80)。
 *
 * Cmd+K パレットと同じ search.query (Typesense) を、腰を据えて探すための専用 UI で
 * 提供する。大きな検索ボックス + type フィルタ + 結果カード。クエリは入力を
 * debounce して投げる。検索が無効（Typesense 未設定）なら空結果。
 */
import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/search')({
  component: SearchRoute,
});

type Hit = { id: string; type: 'page' | 'pbi' | 'sheet'; title: string; body?: string };
type TypeFilter = 'all' | 'page' | 'pbi' | 'sheet';

const TYPE_LABEL: Record<string, string> = { page: 'ページ', pbi: 'PBI', sheet: 'シート' };

function SearchRoute() {
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });
  const current = useCurrentWorkspaceFromList(workspaces.data);
  if (!current) {
    return <p className="px-6 py-12 text-sm text-zinc-500">読み込み中…</p>;
  }
  return <SearchPanel workspaceId={current.id} />;
}

function SearchPanel({ workspaceId }: { workspaceId: string }) {
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('all');

  // debounce: 入力が落ち着いてから検索クエリを確定。
  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 250);
    return () => clearTimeout(id);
  }, [input]);

  const results = useQuery({
    queryKey: ['search', 'query', workspaceId, q, 'page'],
    queryFn: () => trpc.search.query.query({ workspaceId, q, limit: 50 }),
    enabled: q.length > 0,
  });

  const allHits: Hit[] = results.data?.hits ?? [];
  const hits = filter === 'all' ? allHits : allHits.filter((h) => h.type === filter);

  return (
    <div className="w-full max-w-none px-6 py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">🔍 検索</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          ワークスペース内のページ・PBI・シートを横断検索します。
        </p>
      </header>

      <input
        autoFocus
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="キーワードを入力…"
        data-testid="search-input"
        className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base focus:border-violet-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
      />

      <div className="mt-3 flex items-center gap-1" role="tablist" aria-label="種別フィルタ">
        {(['all', 'page', 'pbi', 'sheet'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            data-testid={`search-filter-${f}`}
            aria-selected={filter === f}
            className={`rounded px-3 py-1 text-sm ${
              filter === f
                ? 'bg-violet-100 font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {f === 'all' ? 'すべて' : TYPE_LABEL[f]}
          </button>
        ))}
        {q ? (
          <span className="ml-auto text-xs text-zinc-400" data-testid="search-count">
            {hits.length} 件
          </span>
        ) : null}
      </div>

      <div className="mt-4" data-testid="search-results">
        {q.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-400">キーワードを入力してください。</p>
        ) : results.isPending ? (
          <p className="py-12 text-center text-sm text-zinc-500">検索中…</p>
        ) : hits.length === 0 ? (
          <p className="py-12 text-center text-sm text-zinc-500" data-testid="search-empty">
            「{q}」に一致する結果はありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {hits.map((hit) => (
              <li key={hit.id}>
                <ResultLink hit={hit} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ResultLink({ hit }: { hit: Hit }) {
  const className =
    'block rounded-lg border border-zinc-200 bg-white p-3 hover:border-violet-400 hover:bg-violet-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-violet-600 dark:hover:bg-violet-900/20';
  const inner = (
    <>
      <span className="flex items-center gap-2">
        <span className="rounded bg-zinc-200 px-1.5 font-mono text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
          {TYPE_LABEL[hit.type] ?? hit.type}
        </span>
        <span className="font-medium">{hit.title || '(無題)'}</span>
      </span>
      {hit.body ? (
        <span className="mt-1 line-clamp-2 block text-xs text-zinc-500">{hit.body}</span>
      ) : null}
    </>
  );
  if (hit.type === 'page') {
    return (
      <Link to="/p/$pageId" params={{ pageId: hit.id }} data-testid={`search-hit-${hit.id}`} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <Link to="/b/$blockId" params={{ blockId: hit.id }} data-testid={`search-hit-${hit.id}`} className={className}>
      {inner}
    </Link>
  );
}
