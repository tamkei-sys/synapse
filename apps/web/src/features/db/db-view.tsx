/**
 * User-defined DB のテーブルビュー (PBI-30 MVP)。
 *
 * - ヘッダ: 列名 + 末尾に「+ 列を追加」
 * - 行: セルクリックでインライン編集（kind ごとに input が変わる）
 * - 末尾に「+ 行を追加」
 *
 * 楽観的更新はしない（行数が高々 数十〜数百想定 + 同時編集が稀）。
 * 全 mutation の完了で `db.get` を invalidate して再 fetch。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { DbCellValue, DbColumn, DbColumnKind } from '@synapse/blocks';

import { trpc } from '../../lib/trpc.js';
import { applyFilterSort, DbControls, useDbFilterSort } from './db-filter.js';

type GetResult = Awaited<ReturnType<typeof trpc.db.get.query>>;
type DbRow = GetResult['rows'][number];

export function DbView({ dbId }: { dbId: string }) {
  const qc = useQueryClient();
  const [view, setView] = useState<'table' | 'board' | 'gallery' | 'calendar'>('table');
  const { rules, setRules, sort, setSort } = useDbFilterSort();
  const query = useQuery({
    queryKey: ['db', 'get', dbId],
    queryFn: () => trpc.db.get.query({ dbId }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['db', 'get', dbId] });

  const addRow = useMutation({
    mutationFn: (values?: Record<string, DbCellValue>) =>
      trpc.db.addRow.mutate(values ? { dbId, values } : { dbId }),
    onSuccess: invalidate,
  });

  const deleteRow = useMutation({
    mutationFn: (rowId: string) => trpc.db.deleteRow.mutate({ rowId }),
    onSuccess: invalidate,
  });

  const addColumn = useMutation({
    mutationFn: (column: DbColumn) => trpc.db.addColumn.mutate({ dbId, column }),
    onSuccess: invalidate,
  });

  const updateCell = useMutation({
    mutationFn: (input: { rowId: string; columnId: string; value: DbCellValue }) =>
      trpc.db.updateCell.mutate(input),
    onSuccess: invalidate,
  });

  if (query.isPending) return <p className="text-sm text-zinc-500">読み込み中…</p>;
  if (query.error || !query.data)
    return <p className="text-sm text-red-500">読み込みに失敗しました。</p>;

  const data: GetResult = query.data;
  const visibleRows = applyFilterSort<DbRow>(data.rows, data.props.columns, rules, sort);
  const VIEW_LABEL = {
    table: 'テーブル',
    board: 'ボード',
    gallery: 'ギャラリー',
    calendar: 'カレンダー',
  } as const;

  return (
    <div className="space-y-3" data-testid={`db-view-${dbId}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1" role="tablist" aria-label="DB ビュー">
          {(['table', 'board', 'gallery', 'calendar'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              data-testid={`db-view-tab-${v}`}
              className={`rounded px-2 py-1 text-xs ${
                view === v
                  ? 'bg-violet-100 font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500" data-testid="db-row-count">
          {visibleRows.length}/{data.rows.length} 行 / {data.props.columns.length} 列
        </span>
      </div>

      <DbControls
        columns={data.props.columns}
        rules={rules}
        setRules={setRules}
        sort={sort}
        setSort={setSort}
      />

      {view === 'board' ? (
        <BoardView
          columns={data.props.columns}
          rows={visibleRows}
          onSetCell={(rowId, columnId, value) => updateCell.mutate({ rowId, columnId, value })}
          onAddCard={(values) => addRow.mutate(values)}
        />
      ) : view === 'gallery' ? (
        <GalleryView columns={data.props.columns} rows={visibleRows} />
      ) : view === 'calendar' ? (
        <CalendarView columns={data.props.columns} rows={visibleRows} />
      ) : (
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
          <thead className="bg-zinc-50/60 dark:bg-zinc-900/40">
            <tr>
              {data.props.columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  data-testid={`db-col-${col.id}`}
                  className="border-r border-zinc-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 last:border-r-0 dark:border-zinc-800"
                >
                  <span>{col.name}</span>
                  <span className="ml-1 text-[10px] text-zinc-400">({col.kind})</span>
                </th>
              ))}
              <th scope="col" className="w-12 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {visibleRows.map((row) => (
              <tr
                key={row.id}
                data-testid={`db-row-${row.id}`}
                className="hover:bg-zinc-50/40 dark:hover:bg-zinc-900/30"
              >
                {data.props.columns.map((col) => (
                  <td
                    key={col.id}
                    className="border-r border-zinc-200 px-2 py-1 align-top last:border-r-0 dark:border-zinc-800"
                  >
                    <Cell
                      col={col}
                      value={row.props.values[col.id] ?? null}
                      onChange={(value) =>
                        updateCell.mutate({ rowId: row.id, columnId: col.id, value })
                      }
                    />
                  </td>
                ))}
                <td className="px-2 py-1 text-right">
                  <button
                    type="button"
                    onClick={() => deleteRow.mutate(row.id)}
                    aria-label="行を削除"
                    title="行を削除"
                    data-testid={`db-row-delete-${row.id}`}
                    className="text-xs text-zinc-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
            {visibleRows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.props.columns.length + 1}
                  className="px-3 py-6 text-center text-xs text-zinc-500"
                >
                  {data.rows.length === 0 ? 'まだ行がありません' : '条件に一致する行がありません'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => addRow.mutate(undefined)}
          disabled={addRow.isPending}
          data-testid="db-add-row"
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          + 行を追加
        </button>
        <AddColumnForm
          existingIds={data.props.columns.map((c) => c.id)}
          onAdd={(col) => addColumn.mutate(col)}
          busy={addColumn.isPending}
        />
      </div>
    </div>
  );
}

function Cell({
  col,
  value,
  onChange,
}: {
  col: DbColumn;
  value: DbCellValue;
  onChange: (v: DbCellValue) => void;
}) {
  switch (col.kind) {
    case 'text': {
      const v = typeof value === 'string' ? value : '';
      return <TextCell value={v} onChange={onChange} testid={`db-cell-${col.id}`} />;
    }
    case 'number': {
      const v = typeof value === 'number' ? String(value) : '';
      return (
        <input
          type="number"
          defaultValue={v}
          onBlur={(e) => {
            const s = e.currentTarget.value.trim();
            onChange(s === '' ? null : Number(s));
          }}
          data-testid={`db-cell-${col.id}`}
          className="w-24 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-zinc-300 focus:outline-none dark:focus:border-zinc-600"
        />
      );
    }
    case 'checkbox': {
      const v = value === true;
      return (
        <input
          type="checkbox"
          checked={v}
          onChange={(e) => onChange(e.currentTarget.checked)}
          data-testid={`db-cell-${col.id}`}
          className="h-4 w-4 cursor-pointer"
        />
      );
    }
    case 'select': {
      const v = typeof value === 'string' ? value : '';
      return (
        <select
          value={v}
          onChange={(e) => onChange(e.currentTarget.value || null)}
          data-testid={`db-cell-${col.id}`}
          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-zinc-300 focus:outline-none dark:focus:border-zinc-600"
        >
          <option value="">—</option>
          {(col.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    case 'date': {
      const v = typeof value === 'string' ? value : '';
      return (
        <input
          type="date"
          defaultValue={v}
          onBlur={(e) => onChange(e.currentTarget.value || null)}
          data-testid={`db-cell-${col.id}`}
          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-zinc-300 focus:outline-none dark:focus:border-zinc-600"
        />
      );
    }
    default:
      return <span className="text-xs text-zinc-400">未対応の列タイプ</span>;
  }
}

function TextCell({
  value,
  onChange,
  testid,
}: {
  value: string;
  onChange: (v: string | null) => void;
  testid: string;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <input
      type="text"
      value={draft}
      onChange={(e) => setDraft(e.currentTarget.value)}
      onBlur={() => {
        if (draft !== value) onChange(draft === '' ? null : draft);
      }}
      data-testid={testid}
      className="w-full rounded border border-transparent bg-transparent px-1 py-0.5 text-sm focus:border-zinc-300 focus:outline-none dark:focus:border-zinc-600"
    />
  );
}

const COLUMN_KINDS: DbColumnKind[] = ['text', 'number', 'checkbox', 'select', 'date'];

function AddColumnForm({
  existingIds,
  onAdd,
  busy,
}: {
  existingIds: string[];
  onAdd: (col: DbColumn) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DbColumnKind>('text');
  const [options, setOptions] = useState('');
  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    // id は name から軽く生成。重複ならランダムサフィックス。
    let id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) || 'col';
    while (existingSet.has(id)) id = `${id}_${Math.random().toString(36).slice(2, 5)}`;
    const col: DbColumn = {
      id,
      name: trimmed,
      kind,
      ...(kind === 'select'
        ? {
            options: options
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
          }
        : {}),
    };
    onAdd(col);
    setName('');
    setOptions('');
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      data-testid="db-add-column-form"
      className="flex flex-wrap items-center gap-1.5"
    >
      <input
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        placeholder="列名"
        data-testid="db-add-column-name"
        className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
      />
      <select
        value={kind}
        onChange={(e) => setKind(e.currentTarget.value as DbColumnKind)}
        data-testid="db-add-column-kind"
        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
      >
        {COLUMN_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>
      {kind === 'select' ? (
        <input
          value={options}
          onChange={(e) => setOptions(e.currentTarget.value)}
          placeholder="選択肢 (カンマ区切り)"
          data-testid="db-add-column-options"
          className="w-48 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        />
      ) : null}
      <button
        type="submit"
        disabled={busy || !name.trim()}
        data-testid="db-add-column-submit"
        className="rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-60"
      >
        + 列
      </button>
    </form>
  );
}

// ── Board ビュー (PBI-58) ───────────────────────────────────────────

const UNSET = '__unset__';

/** タイトルに使う列 = 最初の text 列、無ければ最初の列。 */
function titleColumn(cols: readonly DbColumn[]): DbColumn | undefined {
  return cols.find((c) => c.kind === 'text') ?? cols[0];
}

function BoardView({
  columns,
  rows,
  onSetCell,
  onAddCard,
}: {
  columns: readonly DbColumn[];
  rows: readonly DbRow[];
  onSetCell: (rowId: string, columnId: string, value: DbCellValue) => void;
  onAddCard: (values: Record<string, DbCellValue>) => void;
}) {
  const selectCols = useMemo(() => columns.filter((c) => c.kind === 'select'), [columns]);
  const [groupColId, setGroupColId] = useState<string>(selectCols[0]?.id ?? '');
  const groupCol = selectCols.find((c) => c.id === groupColId) ?? selectCols[0];
  const titleCol = titleColumn(columns);

  if (!groupCol) {
    return (
      <p
        data-testid="board-no-select"
        className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700"
      >
        ボード表示には select 列が必要です。「+ 列」で select 列を追加してください。
      </p>
    );
  }

  // 列定義: 各オプション + 未設定。
  const buckets = [...(groupCol.options ?? []), UNSET];

  const rowsFor = (bucket: string) =>
    rows.filter((r) => {
      const v = r.props.values[groupCol.id];
      if (bucket === UNSET) return v === undefined || v === null || v === '';
      return v === bucket;
    });

  return (
    <div className="space-y-2" data-testid="db-board">
      {selectCols.length > 1 ? (
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          グループ化:
          <select
            value={groupCol.id}
            onChange={(e) => setGroupColId(e.currentTarget.value)}
            data-testid="board-group-select"
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          >
            {selectCols.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {buckets.map((bucket) => {
          const rows = rowsFor(bucket);
          const label = bucket === UNSET ? '未設定' : bucket;
          return (
            <div
              key={bucket}
              data-testid={`board-col-${bucket}`}
              className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-2 dark:border-zinc-800 dark:bg-zinc-900/30"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-medium">{label}</span>
                <span className="text-[10px] text-zinc-400">{rows.length}</span>
              </div>
              {rows.map((row) => {
                const title =
                  titleCol && typeof row.props.values[titleCol.id] === 'string'
                    ? String(row.props.values[titleCol.id])
                    : '(無題)';
                return (
                  <div
                    key={row.id}
                    data-testid={`board-card-${row.id}`}
                    className="rounded-md border border-zinc-200 bg-white p-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                  >
                    <p className="mb-1 font-medium">{title}</p>
                    <select
                      value={bucket === UNSET ? '' : bucket}
                      onChange={(e) =>
                        onSetCell(row.id, groupCol.id, e.currentTarget.value || null)
                      }
                      data-testid={`board-card-move-${row.id}`}
                      className="w-full rounded border border-zinc-200 bg-transparent px-1 py-0.5 text-xs dark:border-zinc-700"
                    >
                      <option value="">未設定</option>
                      {(groupCol.options ?? []).map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() =>
                  onAddCard(bucket === UNSET ? {} : { [groupCol.id]: bucket })
                }
                data-testid={`board-add-${bucket}`}
                className="rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                + カード
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Gallery ビュー (PBI-59) ─────────────────────────────────────────

function formatCellShort(col: DbColumn, value: DbCellValue): string {
  if (value === null || value === undefined || value === '') return '—';
  if (col.kind === 'checkbox') return value === true ? '✓' : '—';
  return String(value);
}

function GalleryView({
  columns,
  rows,
}: {
  columns: readonly DbColumn[];
  rows: readonly DbRow[];
}) {
  const titleCol = titleColumn(columns);
  // タイトル列以外を最大 4 つカードに出す。
  const fieldCols = columns.filter((c) => c.id !== titleCol?.id).slice(0, 4);

  if (rows.length === 0) {
    return (
      <p
        data-testid="gallery-empty"
        className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700"
      >
        表示する行がありません
      </p>
    );
  }

  return (
    <div
      data-testid="db-gallery"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {rows.map((row) => {
        const title =
          titleCol && typeof row.props.values[titleCol.id] === 'string'
            ? String(row.props.values[titleCol.id])
            : '(無題)';
        return (
          <div
            key={row.id}
            data-testid={`gallery-card-${row.id}`}
            className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <p className="mb-2 truncate font-medium">{title}</p>
            <dl className="space-y-1 text-xs">
              {fieldCols.map((col) => (
                <div key={col.id} className="flex justify-between gap-2">
                  <dt className="shrink-0 text-zinc-400">{col.name}</dt>
                  <dd className="min-w-0 truncate text-right">
                    {formatCellShort(col, row.props.values[col.id] ?? null)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

// ── Calendar ビュー (PBI-60) ────────────────────────────────────────

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function CalendarView({
  columns,
  rows,
}: {
  columns: readonly DbColumn[];
  rows: readonly DbRow[];
}) {
  const dateCols = columns.filter((c) => c.kind === 'date');
  const [dateColId, setDateColId] = useState<string>(dateCols[0]?.id ?? '');
  const dateCol = dateCols.find((c) => c.id === dateColId) ?? dateCols[0];
  const titleCol = titleColumn(columns);

  // 表示中の年月。初期値は「今日」。
  const now = new Date();
  const [cursor, setCursor] = useState<{ y: number; m: number }>({
    y: now.getFullYear(),
    m: now.getMonth(), // 0-11
  });

  if (!dateCol) {
    return (
      <p
        data-testid="calendar-no-date"
        className="rounded-md border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700"
      >
        カレンダー表示には date 列が必要です。「+ 列」で date 列を追加してください。
      </p>
    );
  }

  // 日付 → その日の行。
  const byDate = new Map<string, DbRow[]>();
  for (const r of rows) {
    const v = r.props.values[dateCol.id];
    if (typeof v === 'string' && v) {
      const list = byDate.get(v) ?? [];
      list.push(r);
      byDate.set(v, list);
    }
  }

  // 月グリッド（6 週 × 7 日）。先頭は月初の週の日曜から。
  const first = new Date(cursor.y, cursor.m, 1);
  const startOffset = first.getDay(); // 0=日
  const cells: { iso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(cursor.y, cursor.m, 1 - startOffset + i);
    cells.push({
      iso: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
      day: d.getDate(),
      inMonth: d.getMonth() === cursor.m,
    });
  }
  const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div className="space-y-2" data-testid="db-calendar">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-1)}
            data-testid="calendar-prev"
            aria-label="前の月"
            className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ‹
          </button>
          <span className="min-w-24 text-center text-sm font-medium" data-testid="calendar-title">
            {cursor.y}年 {cursor.m + 1}月
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            data-testid="calendar-next"
            aria-label="次の月"
            className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => setCursor({ y: now.getFullYear(), m: now.getMonth() })}
            data-testid="calendar-today"
            className="ml-1 rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            今日
          </button>
        </div>
        {dateCols.length > 1 ? (
          <select
            value={dateCol.id}
            onChange={(e) => setDateColId(e.currentTarget.value)}
            data-testid="calendar-date-col"
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          >
            {dateCols.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      <div className="grid grid-cols-7 overflow-hidden rounded-lg border border-zinc-200 text-xs dark:border-zinc-800">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`border-b border-zinc-200 bg-zinc-50/60 px-1 py-1 text-center font-medium dark:border-zinc-800 dark:bg-zinc-900/40 ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-sky-500' : 'text-zinc-500'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((cell, i) => {
          const dayRows = byDate.get(cell.iso) ?? [];
          return (
            <div
              key={`${cell.iso}-${i}`}
              data-testid={`calendar-day-${cell.iso}`}
              className={`min-h-20 border-b border-r border-zinc-100 p-1 dark:border-zinc-800/60 ${
                cell.inMonth ? '' : 'bg-zinc-50/40 text-zinc-400 dark:bg-zinc-900/20'
              }`}
            >
              <div
                className={`mb-0.5 text-right ${
                  cell.iso === todayIso
                    ? 'font-bold text-violet-600 dark:text-violet-300'
                    : ''
                }`}
              >
                {cell.day}
              </div>
              <div className="space-y-0.5">
                {dayRows.slice(0, 3).map((r) => {
                  const title =
                    titleCol && typeof r.props.values[titleCol.id] === 'string'
                      ? String(r.props.values[titleCol.id])
                      : '(無題)';
                  return (
                    <div
                      key={r.id}
                      data-testid={`calendar-event-${r.id}`}
                      className="truncate rounded bg-violet-100 px-1 text-[10px] text-violet-900 dark:bg-violet-900/40 dark:text-violet-100"
                      title={title}
                    >
                      {title}
                    </div>
                  );
                })}
                {dayRows.length > 3 ? (
                  <div className="text-[10px] text-zinc-400">+{dayRows.length - 3}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
