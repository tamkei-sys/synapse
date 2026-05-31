/**
 * Global Cmd+K command palette.
 *
 * Mounts once at the app root; opens on Cmd+K / Ctrl+K, closes on Esc.
 * Search results come from the workspace-scoped `search.query` tRPC
 * procedure, which goes through Typesense.
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { useSession } from '../../lib/auth-client.js';
import { trpc } from '../../lib/trpc.js';

type Hit = {
  id: string;
  type: 'page' | 'pbi' | 'sheet';
  title: string;
  body?: string;
};

export function CommandPalette() {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(0);

  // Global keyboard shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => setSelected(0), [q]);

  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data && open,
  });
  const workspaceId = workspaces.data?.[0]?.id;

  const results = useQuery({
    queryKey: ['search', 'query', workspaceId, q],
    queryFn: () =>
      trpc.search.query.query({
        workspaceId: workspaceId ?? '',
        q,
        limit: 10,
      }),
    enabled: open && !!workspaceId,
  });

  const hits: Hit[] = results.data?.hits ?? [];

  function onPick(hit: Hit) {
    setOpen(false);
    setQ('');
    if (hit.type === 'page') {
      void navigate({ to: '/p/$pageId', params: { pageId: hit.id } });
    } else {
      // PBI / sheet はブロック詳細へ直接ジャンプ（PBI-79: 横断ジャンプ）。
      void navigate({ to: '/b/$blockId', params: { blockId: hit.id } });
    }
  }

  // アクション（ナビゲーション系コマンド）。クエリで前方一致フィルタ。
  const ACTIONS: { id: string; label: string; run: () => void }[] = [
    { id: 'go-pbi', label: '→ PBI 一覧へ', run: () => void navigate({ to: '/pbi' }) },
    { id: 'go-project', label: '→ プロジェクト一覧へ', run: () => void navigate({ to: '/project' }) },
    { id: 'go-sprint', label: '→ スプリント一覧へ', run: () => void navigate({ to: '/sprint' }) },
    { id: 'go-db', label: '→ データベースへ', run: () => void navigate({ to: '/db' }) },
    { id: 'go-trash', label: '→ ゴミ箱へ', run: () => void navigate({ to: '/trash' }) },
  ];
  const actionMatches = ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(q.toLowerCase()));

  function runAction(a: { run: () => void }) {
    setOpen(false);
    setQ('');
    a.run();
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      data-testid="command-palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-6 pt-24"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <input
          autoFocus
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelected((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelected((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
              const hit = hits[selected];
              if (hit) onPick(hit);
            }
          }}
          placeholder="ページ・PBI・シートを検索…"
          data-testid="command-palette-input"
          className="w-full border-b border-zinc-200 bg-transparent px-4 py-3 text-sm focus:outline-none dark:border-zinc-800"
        />
        <ul data-testid="command-palette-results" className="max-h-80 overflow-y-auto p-1">
          {actionMatches.length > 0 ? (
            <>
              <li className="px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                移動
              </li>
              {actionMatches.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => runAction(a)}
                    data-testid={`command-action-${a.id}`}
                    className="flex w-full items-center rounded px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {a.label}
                  </button>
                </li>
              ))}
              {q ? (
                <li className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                  検索結果
                </li>
              ) : null}
            </>
          ) : null}
          {results.isPending && q ? (
            <li className="px-3 py-2 text-sm text-zinc-500">検索中…</li>
          ) : q && hits.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">該当なし</li>
          ) : (
            hits.map((hit, i) => (
              <li key={hit.id}>
                <button
                  type="button"
                  onClick={() => onPick(hit)}
                  onMouseEnter={() => setSelected(i)}
                  data-testid={`command-hit-${hit.id}`}
                  className={`flex w-full flex-col items-start rounded px-3 py-2 text-left text-sm ${
                    i === selected
                      ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-zinc-200 px-1.5 font-mono text-xs text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
                      {hit.type}
                    </span>
                    <span className="font-medium">{hit.title}</span>
                  </span>
                  {hit.body ? (
                    <span className="mt-1 line-clamp-1 text-xs text-zinc-500">{hit.body}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
