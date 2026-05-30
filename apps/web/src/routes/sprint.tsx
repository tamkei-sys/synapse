/**
 * スプリント一覧。
 *
 * 行クリックで詳細 `/b/$blockId` に遷移し、配下 PBI 一覧 + ドキュメント
 * 編集ができる。ステータスはインラインで変更可能。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { SPRINT_STATUSES, type SprintStatus } from '@synapse/blocks';

import {
  FilterControls,
  applyItemFilters,
  type FilterValue,
} from '../features/board/filter-controls.js';
import { KanbanBoard } from '../features/board/kanban-board.js';
import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { formatDate, sprintStatusLabel, statusTone } from '../lib/labels.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/sprint')({
  component: SprintRoute,
});

type SprintRow = Awaited<ReturnType<typeof trpc.sprint.list.query>>[number];
type SprintPropsRead = {
  name: string;
  status: SprintStatus;
  startDate: string;
  endDate: string;
  goal?: string;
  number?: number;
};

function readSprintProps(row: SprintRow): SprintPropsRead {
  const p = (row.props ?? {}) as Partial<SprintPropsRead>;
  return {
    name: p.name ?? '無題スプリント',
    status: p.status ?? 'planning',
    startDate: p.startDate ?? '',
    endDate: p.endDate ?? '',
    ...(p.goal ? { goal: p.goal } : {}),
    ...(typeof p.number === 'number' ? { number: p.number } : {}),
  };
}

function SprintRoute() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  // Hooks は条件分岐 / early return より前にまとめて呼ぶ（Rules of Hooks）。
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
  return <SprintsPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function SprintsPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['sprint', 'list', workspaceId],
    queryFn: () => trpc.sprint.list.query({ workspaceId }),
  });
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goal, setGoal] = useState('');
  const create = useMutation({
    mutationFn: () =>
      trpc.sprint.create.mutate({
        workspaceId,
        name: name.trim(),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(goal ? { goal } : {}),
      }),
    onSuccess: async () => {
      setName('');
      setStartDate('');
      setEndDate('');
      setGoal('');
      await qc.invalidateQueries({ queryKey: ['sprint', 'list', workspaceId] });
    },
  });
  const update = useMutation({
    mutationFn: (args: { sprintId: string; status: SprintStatus }) =>
      trpc.sprint.update.mutate({ sprintId: args.sprintId, patch: { status: args.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sprint', 'list', workspaceId] }),
  });

  const [view, setView] = useState<'list' | 'kanban'>('list');
  const [filters, setFilters] = useState<FilterValue>({});
  const rows = list.data ?? [];
  const filtered = applyItemFilters(rows, filters, (row, key) =>
    key === 'status' ? readSprintProps(row).status : '',
  );
  const FILTER_DEFS = [
    {
      key: 'status',
      label: 'ステータス',
      options: SPRINT_STATUSES.map((s) => ({ value: s, label: sprintStatusLabel[s] })),
    },
  ];
  const KANBAN_COLUMNS = SPRINT_STATUSES.map((s) => ({ value: s, label: sprintStatusLabel[s] }));

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            スプリント一覧 · {workspaceName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← ワークスペースに戻る
            </Link>
            {' · '}
            既定の長さは 2 週間
          </p>
        </div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          create.mutate();
        }}
        data-testid="new-sprint-form"
        className="mb-6 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-[1.4fr_auto_auto_1fr_auto] dark:border-zinc-800 dark:bg-zinc-900/30"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="スプリント名（例：2026-W22）"
          data-testid="new-sprint-name"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          data-testid="new-sprint-start"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          data-testid="new-sprint-end"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="ゴール（任意）"
          data-testid="new-sprint-goal"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={create.isPending || !name.trim()}
          data-testid="create-sprint-submit"
          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          + 計画
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-zinc-300 bg-zinc-50 p-0.5 text-sm dark:border-zinc-700 dark:bg-zinc-900">
          {(['list', 'kanban'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              data-testid={`sprint-view-${v}`}
              aria-pressed={view === v}
              className={`rounded px-3 py-1 ${
                view === v
                  ? 'bg-white shadow-sm dark:bg-zinc-800'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {v === 'list' ? 'リスト' : 'カンバン'}
            </button>
          ))}
        </div>
        <FilterControls filters={FILTER_DEFS} value={filters} onChange={setFilters} />
      </div>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : view === 'kanban' ? (
        <KanbanBoard
          items={filtered}
          columns={KANBAN_COLUMNS}
          getId={(row) => row.id}
          getStatus={(row) => readSprintProps(row).status}
          onChangeStatus={(row, status) =>
            update.mutate({ sprintId: row.id, status: status as SprintStatus })
          }
          renderCard={(row) => {
            const s = readSprintProps(row);
            return (
              <Link
                to="/b/$blockId"
                params={{ blockId: row.id }}
                data-testid={`sprint-name-${row.id}`}
                className="block font-medium hover:underline"
              >
                <span className="mr-1 font-mono text-xs text-zinc-400">SP-{s.number ?? '–'}</span>
                {s.name}
              </Link>
            );
          }}
        />
      ) : filtered.length > 0 ? (
        <ul
          data-testid="sprint-list"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        >
          {filtered.map((row) => {
            const s = readSprintProps(row);
            return (
              <li
                key={row.id}
                data-testid={`sprint-row-${row.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-zinc-400">SP-{s.number ?? '–'}</span>
                    <Link
                      to="/b/$blockId"
                      params={{ blockId: row.id }}
                      data-testid={`sprint-name-${row.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {s.name}
                    </Link>
                  </div>
                  <p className="font-mono text-xs text-zinc-500">
                    期間 {formatDate(s.startDate)} → {formatDate(s.endDate)}
                    {s.goal ? ` · 目標：${s.goal}` : ''}
                  </p>
                </div>
                <select
                  value={s.status}
                  onChange={(e) =>
                    update.mutate({
                      sprintId: row.id,
                      status: e.target.value as SprintStatus,
                    })
                  }
                  disabled={update.isPending}
                  data-testid={`sprint-status-${row.id}`}
                  className={`rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 ${statusTone[s.status] ?? ''}`}
                >
                  {SPRINT_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {sprintStatusLabel[st]}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          スプリントはまだありません。
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
