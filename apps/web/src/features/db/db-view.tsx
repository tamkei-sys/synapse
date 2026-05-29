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

type GetResult = Awaited<ReturnType<typeof trpc.db.get.query>>;

export function DbView({ dbId }: { dbId: string }) {
  const qc = useQueryClient();
  const view = useQuery({
    queryKey: ['db', 'get', dbId],
    queryFn: () => trpc.db.get.query({ dbId }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['db', 'get', dbId] });

  const addRow = useMutation({
    mutationFn: () => trpc.db.addRow.mutate({ dbId }),
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

  if (view.isPending) return <p className="text-sm text-zinc-500">読み込み中…</p>;
  if (view.error || !view.data)
    return <p className="text-sm text-red-500">読み込みに失敗しました。</p>;

  const data: GetResult = view.data;

  return (
    <div className="space-y-3" data-testid={`db-view-${dbId}`}>
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">テーブル</h2>
        <span className="text-xs text-zinc-500" data-testid="db-row-count">
          {data.rows.length} 行 / {data.props.columns.length} 列
        </span>
      </div>
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
            {data.rows.map((row) => (
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
            {data.rows.length === 0 ? (
              <tr>
                <td
                  colSpan={data.props.columns.length + 1}
                  className="px-3 py-6 text-center text-xs text-zinc-500"
                >
                  まだ行がありません
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => addRow.mutate()}
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
