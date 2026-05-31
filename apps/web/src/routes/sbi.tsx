/**
 * SBI ボード — PBI 配下の作業単位を 1 つのカンバンに集約する。
 *
 * 1 番上に「+ 新規 SBI」フォーム（タイトル + 親 PBI + 見積時間）。
 * 親 PBI を選ばないと SBI は作れない（型上の要請）。
 *
 * カードからは親 PBI へのバッジリンクと、SBI 詳細 `/b/$blockId` への
 * タイトルリンクを提供する。詳細ページでドキュメント編集ができる。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import {
  SBI_STATUS_ORDER,
  isOverEstimate,
  isStale,
  nextSbiStatus,
  type SbiStatus,
} from '@synapse/blocks';

import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { sbiStatusLabel, statusTone } from '../lib/labels.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/sbi')({
  component: SbiRoute,
});

type SbiRow = Awaited<ReturnType<typeof trpc.sbi.listForWorkspace.query>>[number];
type PbiRow = Awaited<ReturnType<typeof trpc.pbi.list.query>>[number];

type SbiPropsRead = {
  title: string;
  status: SbiStatus;
  estimateHours?: number;
  actualHours?: number;
  startedAt?: string;
  pbiId: string;
  number?: number;
  assigneeId?: string;
};

function readSbiProps(row: SbiRow): SbiPropsRead {
  const p = (row.props ?? {}) as Partial<SbiPropsRead>;
  return {
    title: p.title ?? '無題 SBI',
    status: p.status ?? 'todo',
    ...(typeof p.estimateHours === 'number' ? { estimateHours: p.estimateHours } : {}),
    ...(typeof p.actualHours === 'number' ? { actualHours: p.actualHours } : {}),
    ...(p.startedAt ? { startedAt: p.startedAt } : {}),
    pbiId: p.pbiId ?? '',
    ...(typeof p.number === 'number' ? { number: p.number } : {}),
    ...(p.assigneeId ? { assigneeId: p.assigneeId } : {}),
  };
}

function SbiAssigneeChip({ workspaceId, userId }: { workspaceId: string; userId: string }) {
  const members = useQuery({
    queryKey: ['workspace', 'listMembers', workspaceId],
    queryFn: () => trpc.workspace.listMembers.query({ workspaceId }),
  });
  const m = members.data?.find((x) => x.userId === userId);
  const name = m?.name ?? m?.email ?? '?';
  const initial = name.trim().slice(0, 1).toUpperCase() || '?';
  return m?.image ? (
    <img
      src={m.image}
      alt={name}
      title={name}
      className="inline-block h-5 w-5 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
    />
  ) : (
    <span
      title={name}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-100 text-[9px] font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
    >
      {initial}
    </span>
  );
}

function SbiRoute() {
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
          ログインしてください
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
  return <SbiPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

function SbiPanel({ workspaceId, workspaceName }: { workspaceId: string; workspaceName: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['sbi', 'listForWorkspace', workspaceId],
    queryFn: () => trpc.sbi.listForWorkspace.query({ workspaceId }),
  });
  const pbis = useQuery({
    queryKey: ['pbi', 'list', workspaceId],
    queryFn: () => trpc.pbi.list.query({ workspaceId }),
  });
  const cycle = useMutation({
    mutationFn: (args: { sbiId: string; status: SbiStatus }) => trpc.sbi.cycleStatus.mutate(args),
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ['sbi', 'listForWorkspace', workspaceId] });
      await qc.invalidateQueries({ queryKey: ['block', 'getAny', row.id] });
    },
  });

  const pbiById = new Map<string, PbiRow>();
  for (const r of pbis.data ?? []) pbiById.set(r.id, r);

  const byStatus = new Map<SbiStatus, SbiRow[]>(SBI_STATUS_ORDER.map((s) => [s, []]));
  for (const row of list.data ?? []) {
    const p = readSbiProps(row);
    byStatus.get(p.status)?.push(row);
  }

  return (
    <div className="w-full max-w-none px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SBI ボード · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← ワークスペースに戻る
            </Link>
            {' · '}
            スプリントバックログアイテム（1〜3 日サイズの作業単位）
          </p>
        </div>
      </header>

      <NewSbiForm workspaceId={workspaceId} pbis={pbis.data ?? []} />

      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : (
        <div
          data-testid="sbi-kanban"
          className="grid gap-3 overflow-x-auto"
          style={{ gridTemplateColumns: `repeat(${SBI_STATUS_ORDER.length}, minmax(220px, 1fr))` }}
        >
          {SBI_STATUS_ORDER.map((status) => {
            const cards = byStatus.get(status) ?? [];
            return (
              <section
                key={status}
                data-testid={`sbi-column-${status}`}
                className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/30"
              >
                <header className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wide text-zinc-500">
                  <span>{sbiStatusLabel[status]}</span>
                  <span>{cards.length}</span>
                </header>
                <ul className="space-y-2">
                  {cards.map((row) => {
                    const p = readSbiProps(row);
                    const over = isOverEstimate(p);
                    const stale = isStale(p);
                    const parent = pbiById.get(p.pbiId);
                    const parentProps = (parent?.props ?? {}) as {
                      number?: number;
                      title?: string;
                    };
                    return (
                      <li
                        key={row.id}
                        data-testid={`sbi-card-${row.id}`}
                        className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <p className="mb-1 font-mono text-[10px] text-zinc-400">
                          SBI-{p.number ?? '–'}
                        </p>
                        <Link
                          to="/b/$blockId"
                          params={{ blockId: row.id }}
                          className="mb-1 block font-medium hover:underline"
                        >
                          {p.title}
                        </Link>
                        {parent ? (
                          <Link
                            to="/b/$blockId"
                            params={{ blockId: parent.id }}
                            data-testid={`sbi-parent-${row.id}`}
                            className="mb-2 inline-flex items-center gap-1 rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[10px] hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                          >
                            <span className="text-zinc-500">親 PBI</span>
                            <span>PBI-{parentProps.number ?? '?'}</span>
                            {parentProps.title ? (
                              <span className="max-w-[7rem] truncate text-zinc-700 dark:text-zinc-300">
                                {parentProps.title}
                              </span>
                            ) : null}
                          </Link>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {typeof p.estimateHours === 'number' ? (
                            <span className="text-zinc-500">見積 {p.estimateHours}h</span>
                          ) : null}
                          {typeof p.actualHours === 'number' ? (
                            <span className="text-zinc-500">実績 {p.actualHours}h</span>
                          ) : null}
                          {over ? (
                            <span
                              data-testid={`sbi-over-${row.id}`}
                              className="rounded bg-amber-100 px-1 font-mono text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                            >
                              超過
                            </span>
                          ) : null}
                          {stale ? (
                            <span
                              data-testid={`sbi-stale-${row.id}`}
                              className="rounded bg-red-100 px-1 font-mono text-red-700 dark:bg-red-900/40 dark:text-red-300"
                            >
                              停滞
                            </span>
                          ) : null}
                          {p.assigneeId ? (
                            <SbiAssigneeChip workspaceId={workspaceId} userId={p.assigneeId} />
                          ) : null}
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              cycle.mutate({
                                sbiId: row.id,
                                status: nextSbiStatus(p.status),
                              })
                            }
                            disabled={cycle.isPending}
                            data-testid={`sbi-cycle-${row.id}`}
                            className={`rounded border border-zinc-300 px-2 py-0.5 font-mono text-xs hover:opacity-80 dark:border-zinc-700 ${statusTone[nextSbiStatus(p.status)] ?? ''}`}
                          >
                            → {sbiStatusLabel[nextSbiStatus(p.status)]}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NewSbiForm({ workspaceId, pbis }: { workspaceId: string; pbis: PbiRow[] }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [pbiId, setPbiId] = useState('');
  const [estimateHours, setEstimateHours] = useState('');

  const create = useMutation({
    mutationFn: () =>
      trpc.sbi.create.mutate({
        pbiId,
        title: title.trim(),
        ...(estimateHours ? { estimateHours: Number(estimateHours) } : {}),
      }),
    onSuccess: async () => {
      setTitle('');
      setEstimateHours('');
      await qc.invalidateQueries({ queryKey: ['sbi', 'listForWorkspace', workspaceId] });
      await qc.invalidateQueries({ queryKey: ['sbi', 'listForPbi', pbiId] });
    },
  });

  if (pbis.length === 0) {
    return (
      <div className="mb-6 rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
        SBI を作成するには、まず{' '}
        <Link to="/pbi" className="text-violet-600 hover:underline">
          PBI を 1 件追加
        </Link>{' '}
        してください。
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !pbiId) return;
        create.mutate();
      }}
      data-testid="new-sbi-form"
      className="mb-6 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-[1fr_auto_auto_auto] dark:border-zinc-800 dark:bg-zinc-900/30"
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="新しい SBI のタイトル"
        data-testid="new-sbi-title"
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        value={pbiId}
        onChange={(e) => setPbiId(e.target.value)}
        data-testid="new-sbi-pbi"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="">親 PBI を選択</option>
        {pbis.map((row) => {
          const p = (row.props ?? {}) as { title?: string; number?: number };
          return (
            <option key={row.id} value={row.id}>
              PBI-{p.number ?? '?'} {p.title ?? ''}
            </option>
          );
        })}
      </select>
      <input
        type="number"
        min={0}
        step={0.5}
        value={estimateHours}
        onChange={(e) => setEstimateHours(e.target.value)}
        placeholder="見積 h"
        data-testid="new-sbi-estimate"
        className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        type="submit"
        disabled={create.isPending || !title.trim() || !pbiId}
        data-testid="new-sbi-submit"
        className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        {create.isPending ? '作成中…' : '+ 新規 SBI'}
      </button>
    </form>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
