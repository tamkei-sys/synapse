/**
 * PBI 一覧 / バックログ / カンバン。
 *
 * - 直接「+ 新規 PBI」フォーム（タイトル + プロジェクト + スプリント
 *   + 優先度 + Fibonacci 見積）を持つ。`/pbi` スラッシュコマンド頼みの
 *   作成 UX は editor 経由でのみ意味があるため、ここでの一次入口にする。
 * - 各カードは PRJ-X / SP-Y の親バッジ、PBI-N の人間 ID、GitHub / CI /
 *   cc の補助バッジを並べる。タイトルをクリックすると詳細ルート
 *   `/b/$blockId` に遷移しドキュメント編集に入る。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import {
  nextStatus,
  PBI_ESTIMATES,
  PBI_STATUS_ORDER,
  PRIORITIES,
  type PbiCiStatus,
  type PbiEstimate,
  type PbiGithubLink,
  type PbiStatus,
  type Priority,
} from '@synapse/blocks';

import {
  FilterControls,
  applyItemFilters,
  type FilterValue,
} from '../features/board/filter-controls.js';
import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import {
  blockHumanPrefix,
  pbiStatusLabel,
  priorityLabel,
  priorityTone,
  statusTone,
} from '../lib/labels.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/pbi')({
  component: PbiBoardRoute,
});

type ViewMode = 'backlog' | 'kanban' | 'timeline';

function PbiBoardRoute() {
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
          ログインして PBI を表示
        </Link>
      </Centered>
    );
  if (!workspace)
    return (
      <Centered>
        <p>ワークスペースがありません。</p>
        <p className="mt-2">
          <Link to="/" className="text-violet-600 hover:underline">
            ← まずはワークスペースを作成
          </Link>
        </p>
      </Centered>
    );

  return <PbiBoard workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function PbiBoard({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const [view, setView] = useState<ViewMode>('backlog');
  const list = useQuery({
    queryKey: ['pbi', 'list', workspaceId],
    queryFn: () => trpc.pbi.list.query({ workspaceId }),
  });
  const [filters, setFilters] = useState<FilterValue>({});
  const filtered = applyItemFilters(list.data ?? [], filters, (row, key) => {
    const p = (row.props ?? {}) as { status?: PbiStatus; priority?: Priority };
    return key === 'status' ? (p.status ?? '') : key === 'priority' ? (p.priority ?? '') : '';
  });
  const FILTER_DEFS = [
    {
      key: 'status',
      label: 'ステータス',
      options: PBI_STATUS_ORDER.map((s) => ({ value: s, label: pbiStatusLabel[s] })),
    },
    {
      key: 'priority',
      label: '優先度',
      options: PRIORITIES.map((p) => ({ value: p, label: priorityLabel[p] })),
    },
  ];

  return (
    <div className="w-full max-w-none px-6 py-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PBI 一覧 · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← ワークスペースに戻る
            </Link>
            {' · '}
            プロダクトバックログアイテム
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </header>

      <NewPbiForm workspaceId={workspaceId} />

      <div className="mb-4">
        <FilterControls filters={FILTER_DEFS} value={filters} onChange={setFilters} />
      </div>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : list.data && list.data.length > 0 ? (
        view === 'backlog' ? (
          <BacklogTable items={filtered} workspaceId={workspaceId} />
        ) : view === 'timeline' ? (
          <TimelineView items={filtered} />
        ) : (
          <KanbanBoard items={filtered} workspaceId={workspaceId} />
        )
      ) : (
        <Empty />
      )}
    </div>
  );
}

function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  const labels: Record<ViewMode, string> = {
    backlog: 'バックログ',
    kanban: 'カンバン',
    timeline: 'タイムライン',
  };
  return (
    <div
      role="tablist"
      data-testid="view-toggle"
      className="inline-flex rounded-md border border-zinc-300 bg-zinc-50 p-0.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      {(['backlog', 'kanban', 'timeline'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          data-testid={`view-${v}`}
          onClick={() => onChange(v)}
          className={`rounded px-3 py-1 ${
            value === v
              ? 'bg-white shadow-sm dark:bg-zinc-800'
              : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
          }`}
        >
          {labels[v]}
        </button>
      ))}
    </div>
  );
}

// ── タイムライン (PBI-61) ────────────────────────────────────

/** UTC 日付文字列 (YYYY-MM-DD) 間の日数差。 */
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

/**
 * PBI を dueDate で時間軸に並べる簡易タイムライン (PBI-61)。期間バーや依存線は
 * 将来 — まずは「いつ期限か」を一望できることを目的にする。dueDate 未設定の
 * PBI は件数だけ末尾に出す。
 */
function TimelineView({ items }: { items: readonly PbiRow[] }) {
  const dated = items
    .map((it) => ({
      it,
      props: (it.props ?? {}) as {
        dueDate?: string;
        title?: string;
        status?: PbiStatus;
      },
    }))
    .filter((x): x is { it: PbiRow; props: { dueDate: string; title?: string; status?: PbiStatus } } =>
      Boolean(x.props.dueDate),
    )
    .sort((a, b) => a.props.dueDate.localeCompare(b.props.dueDate));
  const undatedCount = items.length - dated.length;

  if (dated.length === 0) {
    return (
      <p className="text-sm text-zinc-500" data-testid="timeline-empty">
        期限 (dueDate) が設定された PBI がありません。作成時に期限を入れるとここに並びます。
      </p>
    );
  }

  const minDue = dated[0]!.props.dueDate;
  const maxDue = dated[dated.length - 1]!.props.dueDate;
  const span = Math.max(1, daysBetween(minDue, maxDue));

  return (
    <div data-testid="timeline-view" className="space-y-2">
      <div className="flex justify-between px-[12rem] text-xs text-zinc-400">
        <span>{minDue}</span>
        <span>{maxDue}</span>
      </div>
      <ul className="space-y-1">
        {dated.map(({ it, props }) => {
          const pct = (daysBetween(minDue, props.dueDate) / span) * 100;
          return (
            <li
              key={it.id}
              data-testid={`timeline-item-${it.id}`}
              className="grid grid-cols-[12rem_1fr] items-center gap-2"
            >
              <Link
                to="/b/$blockId"
                params={{ blockId: it.id }}
                className="truncate text-sm hover:underline"
                title={props.title}
              >
                {props.title ?? '無題'}
              </Link>
              <div className="relative h-6 rounded bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="absolute top-0 flex h-6 -translate-x-1/2 items-center"
                  style={{ left: `${pct}%` }}
                >
                  <span
                    className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] ${
                      statusTone[props.status ?? 'backlog'] ?? ''
                    }`}
                  >
                    {props.dueDate}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {undatedCount > 0 ? (
        <p className="pt-2 text-xs text-zinc-400" data-testid="timeline-undated">
          期限なし: {undatedCount} 件
        </p>
      ) : null}
    </div>
  );
}

// ── 新規作成フォーム ─────────────────────────────────────────

function NewPbiForm({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [sprintId, setSprintId] = useState('');
  const [priority, setPriority] = useState<Priority>('should');
  const [estimate, setEstimate] = useState<PbiEstimate | ''>('');
  const [dueDate, setDueDate] = useState('');

  const projects = useQuery({
    queryKey: ['project', 'list', workspaceId],
    queryFn: () => trpc.project.list.query({ workspaceId }),
  });
  const sprints = useQuery({
    queryKey: ['sprint', 'list', workspaceId],
    queryFn: () => trpc.sprint.list.query({ workspaceId }),
  });

  const create = useMutation({
    mutationFn: () =>
      trpc.pbi.create.mutate({
        workspaceId,
        title: title.trim(),
        priority,
        ...(estimate !== '' ? { estimate } : {}),
        ...(projectId ? { projectId } : {}),
        ...(sprintId ? { sprintId } : {}),
        ...(dueDate ? { dueDate } : {}),
      }),
    onSuccess: async () => {
      setTitle('');
      setProjectId('');
      setSprintId('');
      setPriority('should');
      setEstimate('');
      setDueDate('');
      await qc.invalidateQueries({ queryKey: ['pbi', 'list', workspaceId] });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        create.mutate();
      }}
      data-testid="new-pbi-form"
      className="mb-6 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-[1fr_auto_auto_auto_auto_auto_auto] dark:border-zinc-800 dark:bg-zinc-900/30"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="新しい PBI のタイトル"
        data-testid="new-pbi-title"
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        data-testid="new-pbi-project"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">プロジェクト（任意）</option>
        {(projects.data ?? []).map((row) => {
          const p = (row.props ?? {}) as { name?: string; number?: number };
          return (
            <option key={row.id} value={row.id}>
              PRJ-{p.number ?? '?'} {p.name ?? ''}
            </option>
          );
        })}
      </select>
      <select
        value={sprintId}
        onChange={(e) => setSprintId(e.target.value)}
        data-testid="new-pbi-sprint"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">スプリント（任意）</option>
        {(sprints.data ?? []).map((row) => {
          const p = (row.props ?? {}) as { name?: string; number?: number };
          return (
            <option key={row.id} value={row.id}>
              SP-{p.number ?? '?'} {p.name ?? ''}
            </option>
          );
        })}
      </select>
      <select
        value={priority}
        onChange={(e) => setPriority(e.target.value as Priority)}
        data-testid="new-pbi-priority"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            優先：{priorityLabel[p]}
          </option>
        ))}
      </select>
      <select
        value={estimate === '' ? '' : String(estimate)}
        onChange={(e) =>
          setEstimate(e.target.value === '' ? '' : (Number(e.target.value) as PbiEstimate))
        }
        data-testid="new-pbi-estimate"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">見積（任意）</option>
        {PBI_ESTIMATES.map((n) => (
          <option key={n} value={n}>
            {n} sp
          </option>
        ))}
      </select>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        data-testid="new-pbi-due"
        title="期限（任意）"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={create.isPending || !title.trim()}
        data-testid="new-pbi-submit"
        className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {create.isPending ? '作成中…' : '+ 新規 PBI'}
      </button>
    </form>
  );
}

// ── 一覧 / カンバン ─────────────────────────────────────────

type PbiRow = Awaited<ReturnType<typeof trpc.pbi.list.query>>[number];

type PbiPropsRead = {
  title: string;
  status: PbiStatus;
  priority: Priority;
  estimate?: number;
  storyPoints?: number;
  number?: number;
  projectId?: string;
  sprintId?: string;
  assigneeIds?: string[];
  github?: PbiGithubLink;
  ci?: PbiCiStatus;
};

function readPbiProps(row: PbiRow): PbiPropsRead {
  const p = (row.props ?? {}) as Partial<PbiPropsRead>;
  return {
    title: p.title ?? '無題 PBI',
    status: p.status ?? 'backlog',
    priority: p.priority ?? 'should',
    ...(typeof p.estimate === 'number' ? { estimate: p.estimate } : {}),
    ...(typeof p.storyPoints === 'number' ? { storyPoints: p.storyPoints } : {}),
    ...(typeof p.number === 'number' ? { number: p.number } : {}),
    ...(p.projectId ? { projectId: p.projectId } : {}),
    ...(p.sprintId ? { sprintId: p.sprintId } : {}),
    ...(p.assigneeIds && p.assigneeIds.length > 0 ? { assigneeIds: p.assigneeIds } : {}),
    ...(p.github ? { github: p.github } : {}),
    ...(p.ci ? { ci: p.ci } : {}),
  };
}

/** 軽量アバター列。/pbi /sbi の一覧で使う。 */
function AssigneeChips({ workspaceId, ids }: { workspaceId: string; ids: string[] }) {
  const members = useQuery({
    queryKey: ['workspace', 'listMembers', workspaceId],
    queryFn: () => trpc.workspace.listMembers.query({ workspaceId }),
    enabled: ids.length > 0,
  });
  if (ids.length === 0) return null;
  const byId = new Map((members.data ?? []).map((m) => [m.userId, m] as const));
  return (
    <span data-testid="assignee-chips" className="flex -space-x-1.5">
      {ids.slice(0, 3).map((id) => {
        const m = byId.get(id);
        const name = m?.name ?? m?.email ?? '?';
        const initial = name.trim().slice(0, 1).toUpperCase() || '?';
        return m?.image ? (
          <img
            key={id}
            src={m.image}
            alt={name}
            title={name}
            className="inline-block h-5 w-5 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
          />
        ) : (
          <span
            key={id}
            title={name}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[9px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
          >
            {initial}
          </span>
        );
      })}
      {ids.length > 3 ? (
        <span className="ml-1 text-[10px] text-zinc-500">+{ids.length - 3}</span>
      ) : null}
    </span>
  );
}

function CiBadge({ pbiId, ci }: { pbiId: string; ci: PbiCiStatus }) {
  const label =
    ci.status === 'completed'
      ? (ci.conclusion ?? '完了')
      : ci.status === 'in_progress'
        ? '実行中'
        : '待機';
  const tone =
    ci.conclusion === 'success'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300'
      : ci.conclusion === 'failure' || ci.conclusion === 'timed_out'
        ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-700/60 dark:bg-red-900/30 dark:text-red-300'
        : 'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300';
  const inner = (
    <span
      data-testid={`pbi-ci-badge-${pbiId}`}
      data-conclusion={ci.conclusion ?? 'none'}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs ${tone}`}
      title={ci.url ?? ''}
    >
      <span className="text-zinc-500">CI</span>
      <span>{label}</span>
    </span>
  );
  return ci.url ? (
    <a href={ci.url} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

function usePbiUpdate(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { pbiId: string; status: PbiStatus }) =>
      trpc.pbi.update.mutate({ pbiId: args.pbiId, patch: { status: args.status } }),
    onSuccess: async (row) => {
      await queryClient.invalidateQueries({ queryKey: ['pbi', 'list', workspaceId] });
      await queryClient.invalidateQueries({ queryKey: ['pbi', 'get', row.id] });
      await queryClient.invalidateQueries({ queryKey: ['block', 'getAny', row.id] });
    },
  });
}

function ParentBadge({
  kind,
  id,
  workspaceId,
}: {
  kind: 'project' | 'sprint';
  id: string;
  workspaceId: string;
}) {
  // 親の最小限のメタ（番号・名前）を一覧用にキャッシュ。
  const listKey = kind === 'project' ? 'project' : 'sprint';
  const list = useQuery({
    queryKey: [listKey, 'list', workspaceId],
    queryFn: () =>
      kind === 'project'
        ? trpc.project.list.query({ workspaceId })
        : trpc.sprint.list.query({ workspaceId }),
  });
  const parent = list.data?.find((b) => b.id === id);
  const p = (parent?.props ?? {}) as { name?: string; number?: number };
  const prefix = blockHumanPrefix[kind] ?? kind.toUpperCase();
  return (
    <Link
      to="/b/$blockId"
      params={{ blockId: id }}
      data-testid={`pbi-parent-${kind}`}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <span className="text-zinc-500">{kind === 'project' ? 'プロジェクト' : 'スプリント'}</span>
      <span>
        {prefix}-{p.number ?? '?'}
      </span>
      {p.name ? (
        <span className="max-w-[8rem] truncate text-zinc-700 dark:text-zinc-300">{p.name}</span>
      ) : null}
    </Link>
  );
}

function BacklogTable({ items, workspaceId }: { items: PbiRow[]; workspaceId: string }) {
  const update = usePbiUpdate(workspaceId);
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        const an = (a.props as { number?: number } | null)?.number ?? 0;
        const bn = (b.props as { number?: number } | null)?.number ?? 0;
        return an - bn;
      }),
    [items],
  );
  return (
    <ul
      data-testid="pbi-backlog"
      className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
    >
      {sorted.map((row) => {
        const p = readPbiProps(row);
        return (
          <li
            key={row.id}
            data-testid={`pbi-row-${row.id}`}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-xs text-zinc-400" data-testid={`pbi-human-${row.id}`}>
                PBI-{p.number ?? '–'}
              </span>
              <Link
                to="/b/$blockId"
                params={{ blockId: row.id }}
                data-testid={`pbi-title-${row.id}`}
                className="text-sm font-medium hover:underline"
              >
                {p.title}
              </Link>
              <span className={`rounded px-1.5 font-mono text-xs ${priorityTone[p.priority]}`}>
                {priorityLabel[p.priority]}
              </span>
              {typeof p.estimate === 'number' ? (
                <span className="font-mono text-xs text-zinc-500">{p.estimate} sp</span>
              ) : typeof p.storyPoints === 'number' ? (
                <span className="font-mono text-xs text-zinc-500">{p.storyPoints} sp</span>
              ) : null}
              {p.projectId ? (
                <ParentBadge kind="project" id={p.projectId} workspaceId={workspaceId} />
              ) : null}
              {p.sprintId ? (
                <ParentBadge kind="sprint" id={p.sprintId} workspaceId={workspaceId} />
              ) : null}
              {p.assigneeIds && p.assigneeIds.length > 0 ? (
                <AssigneeChips workspaceId={workspaceId} ids={p.assigneeIds} />
              ) : null}
              {p.github ? <GithubBadge pbiId={row.id} link={p.github} /> : null}
              {p.ci ? <CiBadge pbiId={row.id} ci={p.ci} /> : null}
            </div>
            <div className="flex items-center gap-2">
              <GithubLinkControl pbiId={row.id} workspaceId={workspaceId} link={p.github} />
              <ImplementButton pbiId={row.id} />
              <StatusButton
                status={p.status}
                pbiId={row.id}
                onClick={() => update.mutate({ pbiId: row.id, status: nextStatus(p.status) })}
                disabled={update.isPending}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function KanbanBoard({ items, workspaceId }: { items: PbiRow[]; workspaceId: string }) {
  const update = usePbiUpdate(workspaceId);
  const byStatus = new Map<PbiStatus, PbiRow[]>(PBI_STATUS_ORDER.map((s) => [s, []]));
  for (const row of items) {
    const p = readPbiProps(row);
    byStatus.get(p.status)?.push(row);
  }

  return (
    <div
      data-testid="pbi-kanban"
      className="grid gap-4 overflow-x-auto"
      style={{ gridTemplateColumns: `repeat(${PBI_STATUS_ORDER.length}, minmax(220px, 1fr))` }}
    >
      {PBI_STATUS_ORDER.map((status) => {
        const cards = byStatus.get(status) ?? [];
        return (
          <section
            key={status}
            data-testid={`kanban-column-${status}`}
            className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
          >
            <header className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span>{pbiStatusLabel[status]}</span>
              <span>{cards.length}</span>
            </header>
            <ul className="space-y-2">
              {cards.map((row) => {
                const p = readPbiProps(row);
                return (
                  <li
                    key={row.id}
                    data-testid={`kanban-card-${row.id}`}
                    className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <p className="mb-1 font-mono text-[10px] text-zinc-400">
                      PBI-{p.number ?? '–'}
                    </p>
                    <Link
                      to="/b/$blockId"
                      params={{ blockId: row.id }}
                      className="mb-2 block font-medium hover:underline"
                    >
                      {p.title}
                    </Link>
                    <div className="mb-2 flex flex-wrap items-center gap-1">
                      <span
                        className={`rounded px-1 font-mono text-[10px] ${priorityTone[p.priority]}`}
                      >
                        {priorityLabel[p.priority]}
                      </span>
                      {typeof p.estimate === 'number' ? (
                        <span className="font-mono text-[10px] text-zinc-500">{p.estimate} sp</span>
                      ) : null}
                      {p.assigneeIds && p.assigneeIds.length > 0 ? (
                        <AssigneeChips workspaceId={workspaceId} ids={p.assigneeIds} />
                      ) : null}
                    </div>
                    <StatusButton
                      status={p.status}
                      pbiId={row.id}
                      onClick={() => update.mutate({ pbiId: row.id, status: nextStatus(p.status) })}
                      disabled={update.isPending}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function StatusButton({
  status,
  pbiId,
  onClick,
  disabled,
}: {
  status: PbiStatus;
  pbiId: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={`pbi-status-${pbiId}`}
      data-status={status}
      className={`inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs hover:opacity-80 disabled:opacity-60 dark:border-zinc-700 ${statusTone[status] ?? ''}`}
    >
      {pbiStatusLabel[status]}
    </button>
  );
}

function GithubBadge({ pbiId, link }: { pbiId: string; link: PbiGithubLink }) {
  const url = `https://github.com/${link.owner}/${link.repo}/issues/${link.issueNumber}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      data-testid={`pbi-github-badge-${pbiId}`}
      data-state={link.state ?? 'unknown'}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      title={`GitHub Issue ${link.owner}/${link.repo}#${link.issueNumber}（状態：${link.state ?? '不明'}）`}
    >
      <span className="text-zinc-500">GH</span>
      <span>
        {link.owner}/{link.repo}#{link.issueNumber}
      </span>
    </a>
  );
}

function ImplementButton({ pbiId }: { pbiId: string }) {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['cc', 'getForPbi', pbiId],
    queryFn: () => trpc.cc.getForPbi.query({ pbiId }),
    refetchInterval: (q) => {
      const data = q.state.data as { status?: string } | null | undefined;
      if (!data) return false;
      return data.status === 'queued' || data.status === 'running' ? 1_000 : false;
    },
  });

  const start = useMutation({
    mutationFn: () => trpc.cc.startForPbi.mutate({ pbiId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cc', 'getForPbi', pbiId] }),
  });

  const status = session.data?.status as string | undefined;
  const prUrl = session.data?.prUrl as string | null | undefined;
  const inFlight = status === 'queued' || status === 'running';
  const succeeded = status === 'succeeded';

  if (succeeded && prUrl) {
    return (
      <a
        href={prUrl}
        target="_blank"
        rel="noreferrer"
        data-testid={`pbi-cc-pr-${pbiId}`}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300"
      >
        PR を開く ↗
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => start.mutate()}
      disabled={start.isPending || inFlight}
      data-testid={`pbi-implement-${pbiId}`}
      data-cc-status={status ?? 'idle'}
      className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/60 dark:bg-violet-900/30 dark:text-violet-300"
    >
      {inFlight ? '実装中…' : 'cc で実装'}
    </button>
  );
}

function GithubLinkControl({
  pbiId,
  workspaceId,
  link,
}: {
  pbiId: string;
  workspaceId: string;
  link: PbiGithubLink | undefined;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [issueNumber, setIssueNumber] = useState('');

  const invalidateBoard = async () => {
    await queryClient.invalidateQueries({ queryKey: ['pbi', 'list', workspaceId] });
    await queryClient.invalidateQueries({ queryKey: ['pbi', 'get', pbiId] });
  };

  const linkMut = useMutation({
    mutationFn: (args: { owner: string; repo: string; issueNumber: number }) =>
      trpc.pbi.linkGithubIssue.mutate({
        pbiId,
        link: { owner: args.owner, repo: args.repo, issueNumber: args.issueNumber },
      }),
    onSuccess: async () => {
      setOpen(false);
      setOwner('');
      setRepo('');
      setIssueNumber('');
      await invalidateBoard();
    },
  });

  const unlinkMut = useMutation({
    mutationFn: () => trpc.pbi.unlinkGithubIssue.mutate({ pbiId }),
    onSuccess: invalidateBoard,
  });

  if (link) {
    return (
      <button
        type="button"
        onClick={() => unlinkMut.mutate()}
        disabled={unlinkMut.isPending}
        data-testid={`pbi-unlink-${pbiId}`}
        className="text-xs text-zinc-500 hover:text-zinc-900 disabled:opacity-60 dark:hover:text-zinc-100"
      >
        Issue 連携解除
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid={`pbi-link-open-${pbiId}`}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
      >
        + Issue を紐付け
      </button>
    );
  }

  return (
    <form
      data-testid={`pbi-link-form-${pbiId}`}
      onSubmit={(e) => {
        e.preventDefault();
        const num = Number(issueNumber);
        if (!owner.trim() || !repo.trim() || !Number.isInteger(num) || num <= 0) return;
        linkMut.mutate({ owner: owner.trim(), repo: repo.trim(), issueNumber: num });
      }}
      className="flex items-center gap-1.5"
    >
      <input
        type="text"
        placeholder="owner"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        data-testid={`pbi-link-owner-${pbiId}`}
        className="w-20 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="text-zinc-400">/</span>
      <input
        type="text"
        placeholder="repo"
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        data-testid={`pbi-link-repo-${pbiId}`}
        className="w-24 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="text-zinc-400">#</span>
      <input
        type="number"
        min={1}
        placeholder="123"
        value={issueNumber}
        onChange={(e) => setIssueNumber(e.target.value)}
        data-testid={`pbi-link-issue-${pbiId}`}
        className="w-16 rounded border border-zinc-300 bg-white px-1.5 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={linkMut.isPending}
        data-testid={`pbi-link-submit-${pbiId}`}
        className="rounded bg-violet-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {linkMut.isPending ? '…' : '連携'}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      >
        キャンセル
      </button>
    </form>
  );
}

function Empty() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
      PBI はまだありません。上のフォームから直接追加するか、ページ内で{' '}
      <code className="font-mono">/pbi</code> と打って作成してください。
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
