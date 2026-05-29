/**
 * サイドバー上部のワークスペース切替メニュー。
 *
 * クリックで dropdown を開き、所属する全ワークスペースが並ぶ。クリック
 * すると useSwitchWorkspace 経由で localStorage を書き換え、関連クエリを
 * 一掃して再 fetch する。一番下に「+ 新規ワークスペース」のフォーム。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useSwitchWorkspace } from '../../lib/current-workspace.js';
import { trpc } from '../../lib/trpc.js';
import { useDismissOnEscape } from '../../lib/use-dismiss.js';

type Workspace = Awaited<ReturnType<typeof trpc.workspace.listMine.query>>[number];

export function WorkspaceSwitcher({ current }: { current: Workspace }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const switchTo = useSwitchWorkspace();

  const all = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });

  const [newName, setNewName] = useState('');
  const create = useMutation({
    mutationFn: (name: string) => trpc.workspace.create.mutate({ name }),
    onSuccess: async (row) => {
      setNewName('');
      await qc.invalidateQueries({ queryKey: ['workspace', 'listMine'] });
      await switchTo(row.id);
      setOpen(false);
    },
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  useDismissOnEscape(open, () => setOpen(false));

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="workspace-switcher"
        aria-label="ワークスペース切替"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-200 dark:hover:bg-zinc-800"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-violet-600 text-xs font-medium text-white">
            {current.name.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{current.name}</span>
            <span className="block truncate font-mono text-[10px] text-zinc-500">
              {current.slug}
            </span>
          </span>
        </span>
        <span className="text-zinc-400">▾</span>
      </button>

      {open ? (
        <div
          data-testid="workspace-switcher-dropdown"
          className="absolute left-0 right-0 z-40 mt-1 max-h-96 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <ul className="p-1">
            {(all.data ?? []).map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  onClick={async () => {
                    if (w.id !== current.id) await switchTo(w.id);
                    setOpen(false);
                  }}
                  data-testid={`workspace-option-${w.id}`}
                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                    w.id === current.id
                      ? 'bg-violet-50 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
                      : ''
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600 text-[10px] font-medium text-white">
                    {w.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{w.name}</span>
                  {w.id === current.id ? <span className="text-xs">✓</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-zinc-200 p-2 dark:border-zinc-700">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newName.trim()) return;
                create.mutate(newName.trim());
              }}
              className="flex items-center gap-1.5"
              data-testid="new-workspace-form"
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="新しいワークスペース名"
                data-testid="new-workspace-name"
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
              <button
                type="submit"
                disabled={create.isPending || !newName.trim()}
                data-testid="new-workspace-submit"
                className="rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-60"
              >
                +
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
