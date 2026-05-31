import { useQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/settings/audit-log')({
  component: AuditRoute,
});

function AuditRoute() {
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
  return <AuditPanel workspaceId={workspace.id} workspaceName={workspace.name} />;
}

type AuditRow = Awaited<ReturnType<typeof trpc.audit.list.query>>[number];

type Filters = {
  actor: string;
  tool: string;
  result: 'all' | 'ok' | 'error';
  from: string; // ISO date or ''
  to: string;
};

function AuditPanel({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const list = useQuery({
    queryKey: ['audit', 'list', workspaceId],
    queryFn: () => trpc.audit.list.query({ workspaceId, limit: 200 }),
    refetchInterval: 5_000,
  });

  const [filters, setFilters] = useState<Filters>({
    actor: '',
    tool: '',
    result: 'all',
    from: '',
    to: '',
  });

  const filtered = useMemo(() => applyFilters(list.data ?? [], filters), [list.data, filters]);

  const update = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((s) => ({ ...s, [k]: v }));

  return (
    <div className="w-full max-w-none px-6 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">監査ログ · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            MCP ツールの呼び出しが記録されます。フィルタを通した結果を CSV / JSON
            でダウンロードできます。
          </p>
        </div>
        <Link to="/" className="text-sm text-zinc-500 hover:underline">
          ← 戻る
        </Link>
      </header>

      <FilterBar
        filters={filters}
        update={update}
        totalCount={list.data?.length ?? 0}
        filteredCount={filtered.length}
      />

      <ExportBar rows={filtered} />

      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : filtered.length > 0 ? (
        <ul
          data-testid="audit-rows"
          className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 font-mono text-xs dark:divide-zinc-800 dark:border-zinc-800"
        >
          {filtered.map((row) => (
            <li
              key={row.id}
              data-testid={`audit-row-${row.id}`}
              data-result={row.result}
              className="flex items-start gap-3 px-4 py-2"
            >
              <span className="w-44 shrink-0 text-zinc-500">
                {new Date(row.createdAt).toLocaleString('ja-JP')}
              </span>
              <span
                className={`w-12 shrink-0 rounded px-1.5 text-center ${
                  row.result === 'ok'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}
              >
                {row.result === 'ok' ? '成功' : '失敗'}
              </span>
              <span className="w-48 shrink-0 truncate">{row.tool}</span>
              <span className="flex-1 truncate text-zinc-500">
                {row.errorMessage ?? JSON.stringify(row.args ?? {})}
              </span>
            </li>
          ))}
        </ul>
      ) : list.data && list.data.length > 0 ? (
        <EmptyHint>該当する監査ログがありません（フィルタを緩めてください）。</EmptyHint>
      ) : (
        <EmptyHint>
          監査ログはまだありません。<Link to="/settings/tokens">トークン設定</Link> で MCP
          トークンを発行し、cc ツールを叩くとここに並びます。
        </EmptyHint>
      )}
    </div>
  );
}

function FilterBar({
  filters,
  update,
  totalCount,
  filteredCount,
}: {
  filters: Filters;
  update: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  totalCount: number;
  filteredCount: number;
}) {
  return (
    <section
      data-testid="audit-filters"
      className="mb-3 grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto_auto] dark:border-zinc-800 dark:bg-zinc-900/30"
    >
      <input
        value={filters.actor}
        onChange={(e) => update('actor', e.target.value)}
        placeholder="actor (user id 部分一致)"
        data-testid="audit-filter-actor"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        value={filters.tool}
        onChange={(e) => update('tool', e.target.value)}
        placeholder="tool (部分一致)"
        data-testid="audit-filter-tool"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <select
        value={filters.result}
        onChange={(e) => update('result', e.target.value as Filters['result'])}
        data-testid="audit-filter-result"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="all">結果：すべて</option>
        <option value="ok">成功のみ</option>
        <option value="error">失敗のみ</option>
      </select>
      <input
        type="date"
        value={filters.from}
        onChange={(e) => update('from', e.target.value)}
        data-testid="audit-filter-from"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <input
        type="date"
        value={filters.to}
        onChange={(e) => update('to', e.target.value)}
        data-testid="audit-filter-to"
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
      />
      <span className="self-center text-xs text-zinc-500">
        {filteredCount} / {totalCount} 件
      </span>
    </section>
  );
}

function ExportBar({ rows }: { rows: AuditRow[] }) {
  const disabled = rows.length === 0;
  return (
    <div className="mb-4 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => downloadBlob(toCsv(rows), 'audit-log', 'csv', 'text/csv;charset=utf-8')}
        disabled={disabled}
        data-testid="audit-export-csv"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        CSV ダウンロード
      </button>
      <button
        type="button"
        onClick={() => downloadBlob(toJson(rows), 'audit-log', 'json', 'application/json')}
        disabled={disabled}
        data-testid="audit-export-json"
        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        JSON ダウンロード
      </button>
    </div>
  );
}

function applyFilters(rows: AuditRow[], f: Filters): AuditRow[] {
  const actorQ = f.actor.trim().toLowerCase();
  const toolQ = f.tool.trim().toLowerCase();
  const fromMs = f.from ? Date.parse(`${f.from}T00:00:00`) : -Infinity;
  const toMs = f.to ? Date.parse(`${f.to}T23:59:59.999`) : Infinity;
  return rows.filter((r) => {
    if (actorQ) {
      const actor = (r.actorUserId ?? r.actorTokenId ?? '').toLowerCase();
      if (!actor.includes(actorQ)) return false;
    }
    if (toolQ && !r.tool.toLowerCase().includes(toolQ)) return false;
    if (f.result === 'ok' && r.result !== 'ok') return false;
    if (f.result === 'error' && r.result === 'ok') return false;
    const ts = new Date(r.createdAt).getTime();
    if (ts < fromMs || ts > toMs) return false;
    return true;
  });
}

function csvEscape(s: string): string {
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: AuditRow[]): string {
  const header = [
    'created_at',
    'actor_user_id',
    'actor_token_id',
    'tool',
    'result',
    'args',
    'error',
  ];
  const body = rows.map((r) =>
    [
      new Date(r.createdAt).toISOString(),
      r.actorUserId ?? '',
      r.actorTokenId ?? '',
      r.tool,
      r.result,
      JSON.stringify(r.args ?? {}),
      r.errorMessage ?? '',
    ]
      .map((c) => csvEscape(String(c)))
      .join(','),
  );
  return [header.join(','), ...body].join('\n');
}

function toJson(rows: AuditRow[]): string {
  return JSON.stringify(rows, null, 2);
}

function downloadBlob(content: string, baseName: string, ext: string, mime: string): void {
  if (typeof window === 'undefined') return;
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}-${stamp}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
      {children}
    </p>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
