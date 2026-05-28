/**
 * プロジェクト一覧。
 *
 * 行をクリックするとプロジェクト詳細 `/b/$blockId` に飛び、PBI 一覧 +
 * ドキュメント編集ができる。インラインでステータス変更も可能。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { PRIORITIES, PROJECT_STATUSES, type Priority, type ProjectStatus } from '@synapse/blocks';

import { useSession } from '../lib/auth-client.js';
import {
  formatDate,
  priorityLabel,
  priorityTone,
  projectStatusLabel,
  statusTone,
} from '../lib/labels.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/project')({
  component: ProjectRoute,
});

type ProjectRow = Awaited<ReturnType<typeof trpc.project.list.query>>[number];
type ProjectPropsRead = {
  name: string;
  status: ProjectStatus;
  priority: Priority;
  number?: number;
  startDate?: string;
  plannedDate?: string;
};

function readProjectProps(row: ProjectRow): ProjectPropsRead {
  const p = (row.props ?? {}) as Partial<ProjectPropsRead>;
  return {
    name: p.name ?? '無題',
    status: p.status ?? 'backlog',
    priority: p.priority ?? 'should',
    ...(typeof p.number === 'number' ? { number: p.number } : {}),
    ...(p.startDate ? { startDate: p.startDate } : {}),
    ...(p.plannedDate ? { plannedDate: p.plannedDate } : {}),
  };
}

function ProjectRoute() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  if (session.isPending || workspaces.isPending) return <Centered>読み込み中…</Centered>;
  if (!session.data)
    return (
      <Centered>
        <Link to="/login" className="text-violet-600 hover:underline">
          ログイン
        </Link>
      </Centered>
    );
  const workspace = workspaces.data?.[0];
  if (!workspace)
    return (
      <Centered>
        <Link to="/" className="text-violet-600 hover:underline">
          まずはワークスペースを作成
        </Link>
      </Centered>
    );
  return <ProjectsPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function ProjectsPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['project', 'list', workspaceId],
    queryFn: () => trpc.project.list.query({ workspaceId }),
  });
  const [name, setName] = useState('');
  const [priority, setPriority] = useState<Priority>('should');
  const create = useMutation({
    mutationFn: () => trpc.project.create.mutate({ workspaceId, name: name.trim(), priority }),
    onSuccess: async () => {
      setName('');
      setPriority('should');
      await qc.invalidateQueries({ queryKey: ['project', 'list', workspaceId] });
    },
  });
  const update = useMutation({
    mutationFn: (args: { projectId: string; status: ProjectStatus }) =>
      trpc.project.update.mutate({ projectId: args.projectId, patch: { status: args.status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', 'list', workspaceId] }),
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            プロジェクト一覧 · {workspaceName}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← ワークスペースに戻る
            </Link>
            {' · '}
            行クリックで詳細・配下 PBI に遷移
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            create.mutate();
          }}
          data-testid="new-project-form"
          className="flex items-center gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="新規プロジェクト名"
            data-testid="new-project-name"
            className="w-56 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            data-testid="new-project-priority"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                優先：{priorityLabel[p]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={create.isPending || !name.trim()}
            data-testid="create-project-submit"
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            + 作成
          </button>
        </form>
      </header>

      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : list.data && list.data.length > 0 ? (
        <ul
          data-testid="project-list"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
        >
          {list.data.map((row) => {
            const p = readProjectProps(row);
            return (
              <li
                key={row.id}
                data-testid={`project-row-${row.id}`}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-400">PRJ-{p.number ?? '–'}</span>
                  <Link
                    to="/b/$blockId"
                    params={{ blockId: row.id }}
                    data-testid={`project-name-${row.id}`}
                    className="text-sm font-medium hover:underline"
                  >
                    {p.name}
                  </Link>
                  <span className={`rounded px-1.5 font-mono text-xs ${priorityTone[p.priority]}`}>
                    {priorityLabel[p.priority]}
                  </span>
                  {p.startDate ? (
                    <span className="font-mono text-xs text-zinc-500">
                      開始 {formatDate(p.startDate)}
                    </span>
                  ) : null}
                </div>
                <select
                  value={p.status}
                  onChange={(e) =>
                    update.mutate({ projectId: row.id, status: e.target.value as ProjectStatus })
                  }
                  disabled={update.isPending}
                  data-testid={`project-status-${row.id}`}
                  className={`rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 ${statusTone[p.status] ?? ''}`}
                >
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {projectStatusLabel[s]}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-zinc-500 dark:border-zinc-700">
          プロジェクトはまだありません。上のフォームから 1 つ作成してください。
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
