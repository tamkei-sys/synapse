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
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HyperFormula } from 'hyperformula';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { DbCellValue, DbColumn, DbColumnKind, RollupFn } from '@synapse/blocks';
import { ROLLUP_FNS } from '@synapse/blocks';

import { trpc } from '../../lib/trpc.js';
import { applyFilterSort, DbControls, useDbFilterSort } from './db-filter.js';

type GetResult = Awaited<ReturnType<typeof trpc.db.get.query>>;
type DbRow = GetResult['rows'][number];
type RelationMap = GetResult['relations'];

export function DbView({ dbId }: { dbId: string }) {
  const qc = useQueryClient();
  const [view, setView] = useState<'table' | 'board' | 'gallery' | 'calendar' | 'form'>('table');
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

  const updateColumn = useMutation({
    mutationFn: (column: DbColumn) => trpc.db.updateColumn.mutate({ dbId, column }),
    onSuccess: invalidate,
  });

  const deleteColumn = useMutation({
    mutationFn: (columnId: string) => trpc.db.deleteColumn.mutate({ dbId, columnId }),
    onSuccess: invalidate,
  });

  const updateCell = useMutation({
    mutationFn: (input: { rowId: string; columnId: string; value: DbCellValue }) =>
      trpc.db.updateCell.mutate(input),
    onSuccess: invalidate,
  });

  const reorderRows = useMutation({
    mutationFn: (orderedRowIds: string[]) => trpc.db.reorderRows.mutate({ dbId, orderedRowIds }),
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
    form: 'フォーム',
  } as const;

  return (
    <div className="space-y-3" data-testid={`db-view-${dbId}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1" role="tablist" aria-label="DB ビュー">
          {(['table', 'board', 'gallery', 'calendar', 'form'] as const).map((v) => (
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

      {view === 'form' ? (
        <FormView
          columns={data.props.columns}
          busy={addRow.isPending}
          onSubmit={(values) => addRow.mutate(values)}
        />
      ) : view === 'board' ? (
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
        <TableView
          columns={data.props.columns}
          rows={visibleRows}
          totalRowCount={data.rows.length}
          relations={data.relations}
          rollups={data.rollups}
          reorderable={sort === null && rules.length === 0}
          onUpdateCell={(rowId, columnId, value) =>
            updateCell.mutate({ rowId, columnId, value })
          }
          onDeleteRow={(rowId) => deleteRow.mutate(rowId)}
          onReorder={(orderedRowIds) => reorderRows.mutate(orderedRowIds)}
          onUpdateColumn={(column) => updateColumn.mutate(column)}
          onDeleteColumn={(columnId) => deleteColumn.mutate(columnId)}
        />
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
          columns={data.props.columns}
          workspaceId={data.workspaceId}
          currentDbId={dbId}
          onAdd={(col) => addColumn.mutate(col)}
          busy={addColumn.isPending}
        />
      </div>
    </div>
  );
}

// ── Form ビュー (PBI-66) ─────────────────────────────────────────────

/** Form ビューで入力できる列の種類。formula/relation/rollup は派生・複雑なので除外。 */
const FORM_INPUT_KINDS: readonly DbColumnKind[] = ['text', 'number', 'select', 'checkbox', 'date'];

/** 入力可能な列だけのフォームで 1 行を作成する。 */
function FormView({
  columns,
  busy,
  onSubmit,
}: {
  columns: readonly DbColumn[];
  busy: boolean;
  onSubmit: (values: Record<string, DbCellValue>) => void;
}) {
  const fields = columns.filter((c) => FORM_INPUT_KINDS.includes(c.kind));
  const [values, setValues] = useState<Record<string, DbCellValue>>({});
  const set = (id: string, v: DbCellValue) =>
    setValues((prev) => {
      const next = { ...prev };
      if (v === null || v === '') delete next[id];
      else next[id] = v;
      return next;
    });

  if (fields.length === 0) {
    return <p className="text-sm text-zinc-500">入力できる列がありません。</p>;
  }

  return (
    <form
      data-testid="db-form-view"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
        setValues({});
      }}
      className="max-w-md space-y-3 rounded-md border border-zinc-200 p-4 dark:border-zinc-700"
    >
      {fields.map((c) => (
        <label key={c.id} className="block">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            {c.name}
          </span>
          {c.kind === 'select' ? (
            <select
              value={typeof values[c.id] === 'string' ? (values[c.id] as string) : ''}
              onChange={(e) => set(c.id, e.target.value || null)}
              data-testid={`db-form-field-${c.id}`}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">—</option>
              {(c.options ?? []).map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : c.kind === 'checkbox' ? (
            <input
              type="checkbox"
              checked={values[c.id] === true}
              onChange={(e) => set(c.id, e.target.checked)}
              data-testid={`db-form-field-${c.id}`}
              className="h-4 w-4"
            />
          ) : c.kind === 'number' ? (
            <input
              type="number"
              value={typeof values[c.id] === 'number' ? String(values[c.id]) : ''}
              onChange={(e) => set(c.id, e.target.value === '' ? null : Number(e.target.value))}
              data-testid={`db-form-field-${c.id}`}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          ) : c.kind === 'date' ? (
            <input
              type="date"
              value={typeof values[c.id] === 'string' ? (values[c.id] as string) : ''}
              onChange={(e) => set(c.id, e.target.value || null)}
              data-testid={`db-form-field-${c.id}`}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          ) : (
            <input
              type="text"
              value={typeof values[c.id] === 'string' ? (values[c.id] as string) : ''}
              onChange={(e) => set(c.id, e.target.value || null)}
              data-testid={`db-form-field-${c.id}`}
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={busy}
        data-testid="db-form-submit"
        className="rounded-md bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
      >
        行を追加
      </button>
    </form>
  );
}

// ── Formula 列 (PBI-65) ─────────────────────────────────────────────

/** 0始まりの列番号 → スプレッドシート列名（A, B, …, Z, AA, …）。 */
function colLetter(n: number): string {
  let s = '';
  let x = n + 1;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

/**
 * formula 列を HyperFormula でクライアント評価 (PBI-65)。式は他列を
 * `{列名}` で参照する。各行を 1 行のシートに見立て、operand 列を実値、
 * formula 列を式として流し込み、計算結果を rowId→colId→値 で返す。
 */
function computeFormulas(
  columns: readonly DbColumn[],
  rows: readonly DbRow[],
): Record<string, Record<string, number | string | null>> {
  const formulaCols = columns.filter((c) => c.kind === 'formula');
  if (formulaCols.length === 0) return {};
  const operandCols = columns.filter((c) => c.kind !== 'formula');

  const letterOf = new Map<string, string>();
  operandCols.forEach((c, i) => letterOf.set(c.id, colLetter(i)));
  formulaCols.forEach((c, i) => letterOf.set(c.id, colLetter(operandCols.length + i)));
  const nameToId = new Map<string, string>();
  for (const c of columns) if (!nameToId.has(c.name)) nameToId.set(c.name, c.id);

  const data: (string | number | boolean | null)[][] = rows.map((row, r) => {
    const line: (string | number | boolean | null)[] = [];
    for (const c of operandCols) {
      const v = row.props.values[c.id];
      line.push(typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' ? v : null);
    }
    for (const fc of formulaCols) {
      const expr = (fc.formulaExpr ?? '').trim();
      if (!expr) {
        line.push(null);
        continue;
      }
      const translated = expr.replace(/\{([^}]+)\}/g, (_, ref: string) => {
        const id = nameToId.get(ref.trim()) ?? ref.trim();
        const letter = letterOf.get(id);
        return letter ? `${letter}${r + 1}` : '#REF!';
      });
      line.push(`=${translated}`);
    }
    return line;
  });

  const hf = HyperFormula.buildFromArray(data, { licenseKey: 'gpl-v3' });
  const out: Record<string, Record<string, number | string | null>> = {};
  rows.forEach((row, r) => {
    const per: Record<string, number | string | null> = {};
    formulaCols.forEach((fc, i) => {
      const v = hf.getCellValue({ sheet: 0, col: operandCols.length + i, row: r });
      if (v === null || typeof v === 'number' || typeof v === 'string') per[fc.id] = v;
      else if (typeof v === 'boolean') per[fc.id] = v ? 'TRUE' : 'FALSE';
      else per[fc.id] = String((v as { value?: unknown }).value ?? '#ERR');
    });
    out[row.id] = per;
  });
  hf.destroy();
  return out;
}

// ── テーブルビュー + 行 DnD (PBI-71) ────────────────────────────────

function TableView({
  columns,
  rows,
  totalRowCount,
  relations,
  rollups,
  reorderable,
  onUpdateCell,
  onDeleteRow,
  onReorder,
  onUpdateColumn,
  onDeleteColumn,
}: {
  columns: readonly DbColumn[];
  rows: readonly DbRow[];
  totalRowCount: number;
  relations: RelationMap;
  rollups: GetResult['rollups'];
  reorderable: boolean;
  onUpdateCell: (rowId: string, columnId: string, value: DbCellValue) => void;
  onDeleteRow: (rowId: string) => void;
  onReorder: (orderedRowIds: string[]) => void;
  onUpdateColumn: (column: DbColumn) => void;
  onDeleteColumn: (columnId: string) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const ids = useMemo(() => rows.map((r) => r.id), [rows]);
  const formulas = useMemo(() => computeFormulas(columns, rows), [columns, rows]);
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove([...ids], oldIndex, newIndex));
  };
  const colSpan = columns.length + 1 + (reorderable ? 1 : 0);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
        <thead className="bg-zinc-50/60 dark:bg-zinc-900/40">
          <tr>
            {reorderable ? (
              <th scope="col" className="w-8 px-1 py-2" aria-label="並べ替え"></th>
            ) : null}
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                data-testid={`db-col-${col.id}`}
                className="border-r border-zinc-200 px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 last:border-r-0 dark:border-zinc-800"
              >
                <ColumnHeaderMenu
                  column={col}
                  canDelete={columns.length > 1}
                  onUpdate={onUpdateColumn}
                  onDelete={onDeleteColumn}
                />
              </th>
            ))}
            <th scope="col" className="w-12 px-2 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              {rows.map((row) => (
                <SortableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  relations={relations}
                  rollups={rollups}
                  formulas={formulas}
                  reorderable={reorderable}
                  onUpdateCell={onUpdateCell}
                  onDeleteRow={onDeleteRow}
                />
              ))}
            </SortableContext>
          </DndContext>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={colSpan} className="px-3 py-6 text-center text-xs text-zinc-500">
                {totalRowCount === 0 ? 'まだ行がありません' : '条件に一致する行がありません'}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function SortableRow({
  row,
  columns,
  relations,
  rollups,
  formulas,
  reorderable,
  onUpdateCell,
  onDeleteRow,
}: {
  row: DbRow;
  columns: readonly DbColumn[];
  relations: RelationMap;
  rollups: GetResult['rollups'];
  formulas: Record<string, Record<string, number | string | null>>;
  reorderable: boolean;
  onUpdateCell: (rowId: string, columnId: string, value: DbCellValue) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id,
    disabled: !reorderable,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      data-testid={`db-row-${row.id}`}
      className="bg-white hover:bg-zinc-50/40 dark:bg-zinc-950 dark:hover:bg-zinc-900/30"
    >
      {reorderable ? (
        <td className="px-1 py-1 align-middle">
          <button
            type="button"
            {...attributes}
            {...listeners}
            aria-label="ドラッグして並べ替え"
            data-testid={`db-row-handle-${row.id}`}
            className="cursor-grab text-zinc-300 hover:text-zinc-500 active:cursor-grabbing dark:text-zinc-600 dark:hover:text-zinc-400"
          >
            ⠿
          </button>
        </td>
      ) : null}
      {columns.map((col) => (
        <td
          key={col.id}
          className="border-r border-zinc-200 px-2 py-1 align-top last:border-r-0 dark:border-zinc-800"
        >
          <Cell
            col={col}
            value={row.props.values[col.id] ?? null}
            relation={relations[col.id]}
            rollupValue={rollups[row.id]?.[col.id] ?? null}
            formulaValue={formulas[row.id]?.[col.id] ?? null}
            onChange={(value) => onUpdateCell(row.id, col.id, value)}
          />
        </td>
      ))}
      <td className="px-2 py-1 text-right">
        <button
          type="button"
          onClick={() => onDeleteRow(row.id)}
          aria-label="行を削除"
          title="行を削除"
          data-testid={`db-row-delete-${row.id}`}
          className="text-xs text-zinc-400 hover:text-red-500"
        >
          ×
        </button>
      </td>
    </tr>
  );
}

function Cell({
  col,
  value,
  relation,
  rollupValue,
  formulaValue,
  onChange,
}: {
  col: DbColumn;
  value: DbCellValue;
  relation?: RelationMap[string];
  rollupValue?: number | string | null;
  formulaValue?: number | string | null;
  onChange: (v: DbCellValue) => void;
}) {
  switch (col.kind) {
    case 'formula':
      return (
        <span
          data-testid={`db-cell-${col.id}`}
          className="block px-1 py-0.5 text-sm text-zinc-600 dark:text-zinc-300"
        >
          {formatRollup(formulaValue ?? null)}
        </span>
      );
    case 'relation':
      return (
        <RelationCell
          value={Array.isArray(value) ? value : []}
          options={relation?.options ?? []}
          onChange={(ids) => onChange(ids.length ? ids : null)}
          testid={`db-cell-${col.id}`}
        />
      );
    case 'rollup':
      return (
        <span
          data-testid={`db-cell-${col.id}`}
          className="block px-1 py-0.5 text-sm text-zinc-600 dark:text-zinc-300"
        >
          {formatRollup(rollupValue ?? null)}
        </span>
      );
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

/** rollup の集計値を表示用文字列に。avg は小数2桁まで。 */
function formatRollup(value: number | string | null): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }
  return value;
}

/** relation セル: 選択済みをチップ表示し、ドロップダウンで参照先行を追加する。 */
function RelationCell({
  value,
  options,
  onChange,
  testid,
}: {
  value: string[];
  options: { id: string; label: string }[];
  onChange: (ids: string[]) => void;
  testid: string;
}) {
  const labelOf = useMemo(() => new Map(options.map((o) => [o.id, o.label])), [options]);
  const selected = new Set(value);
  const available = options.filter((o) => !selected.has(o.id));

  return (
    <div className="flex flex-wrap items-center gap-1" data-testid={testid}>
      {value.map((id) => (
        <span
          key={id}
          className="inline-flex items-center gap-0.5 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-900 dark:bg-violet-900/40 dark:text-violet-100"
        >
          {labelOf.get(id) ?? '(不明)'}
          <button
            type="button"
            onClick={() => onChange(value.filter((v) => v !== id))}
            aria-label="リンクを外す"
            className="text-violet-500 hover:text-red-500"
          >
            ×
          </button>
        </span>
      ))}
      {available.length > 0 ? (
        <select
          value=""
          onChange={(e) => {
            const id = e.currentTarget.value;
            if (id) onChange([...value, id]);
          }}
          data-testid={`${testid}-add`}
          className="rounded border border-transparent bg-transparent px-1 py-0.5 text-xs text-zinc-400 focus:border-zinc-300 focus:outline-none dark:focus:border-zinc-600"
        >
          <option value="">+ リンク</option>
          {available.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

const COLUMN_KINDS: DbColumnKind[] = [
  'text',
  'number',
  'checkbox',
  'select',
  'date',
  'relation',
  'rollup',
];

/** 基本型（互換変換が定義済み）への型変更のみ許可。relation/rollup/formula は除外。 */
const EDITABLE_KINDS: readonly DbColumnKind[] = ['text', 'number', 'select', 'checkbox', 'date'];
const KIND_LABEL: Record<string, string> = {
  text: 'テキスト',
  number: '数値',
  select: '選択',
  checkbox: 'チェック',
  date: '日付',
  relation: 'リレーション',
  rollup: 'ロールアップ',
  formula: '数式',
};

/** 列ヘッダのメニュー（リネーム / 型変更 / 選択肢編集 / 削除）。 */
function ColumnHeaderMenu({
  column,
  canDelete,
  onUpdate,
  onDelete,
}: {
  column: DbColumn;
  canDelete: boolean;
  onUpdate: (column: DbColumn) => void;
  onDelete: (columnId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(column.name);
  const [kind, setKind] = useState<DbColumnKind>(column.kind);
  const [options, setOptions] = useState((column.options ?? []).join(', '));
  // 派生型（relation/rollup/formula）は型変更不可。基本型のみ select に出す。
  const kindEditable = EDITABLE_KINDS.includes(column.kind);

  // テーブルの overflow コンテナにクリップ／intercept されないよう、画面中央の
  // モーダルとして createPortal(document.body) で出す（command-palette / 差分モーダルと
  // 同方式）。座標計算で下方向に出すと展開分が viewport 外にはみ出すため中央固定。
  const openMenu = () => setOpen((v) => !v);

  const save = () => {
    const next: DbColumn = { ...column, name: name.trim() || column.name, kind };
    if (kind === 'select') {
      const opts = options
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (opts.length) next.options = opts;
      else delete next.options;
    } else {
      delete next.options;
    }
    onUpdate(next);
    setOpen(false);
  };

  return (
    <span className="relative inline-flex items-center gap-1">
      <button
        type="button"
        onClick={openMenu}
        data-testid={`db-col-menu-${column.id}`}
        className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
        title="列を編集"
      >
        <span>{column.name}</span>
        <span className="text-[10px] text-zinc-400">({KIND_LABEL[column.kind] ?? column.kind})</span>
        <span aria-hidden className="text-[8px]">▾</span>
      </button>
      {open
        ? createPortal(
            <div
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 p-4 pt-32"
            >
              <div
                onClick={(e) => e.stopPropagation()}
                data-testid={`db-col-editor-${column.id}`}
                className="w-72 space-y-2 rounded-md border border-zinc-200 bg-white p-3 normal-case shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
              >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid={`db-col-name-${column.id}`}
              placeholder="列名"
              className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            />
            {kindEditable ? (
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as DbColumnKind)}
                data-testid={`db-col-kind-${column.id}`}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              >
                {EDITABLE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-[10px] text-zinc-400">
                {KIND_LABEL[column.kind]} 型は名前のみ変更できます
              </p>
            )}
            {kind === 'select' ? (
              <input
                value={options}
                onChange={(e) => setOptions(e.target.value)}
                data-testid={`db-col-options-${column.id}`}
                placeholder="選択肢（カンマ区切り）"
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
              />
            ) : null}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={save}
                data-testid={`db-col-save-${column.id}`}
                className="rounded bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-500"
              >
                保存
              </button>
              {canDelete ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`列「${column.name}」を削除しますか？この列の値も消えます。`)) {
                      onDelete(column.id);
                      setOpen(false);
                    }
                  }}
                  data-testid={`db-col-delete-${column.id}`}
                  className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  削除
                </button>
              ) : null}
            </div>
          </div>
            </>,
            document.body,
          )
        : null}
    </span>
  );
}

function AddColumnForm({
  existingIds,
  columns,
  workspaceId,
  currentDbId,
  onAdd,
  busy,
}: {
  existingIds: string[];
  columns: readonly DbColumn[];
  workspaceId: string;
  currentDbId: string;
  onAdd: (col: DbColumn) => void;
  busy: boolean;
}) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<DbColumnKind>('text');
  const [options, setOptions] = useState('');
  const [relationDbId, setRelationDbId] = useState('');
  const [rollupRelationColumnId, setRollupRelationColumnId] = useState('');
  const [rollupTargetColumnId, setRollupTargetColumnId] = useState('');
  const [rollupFn, setRollupFn] = useState<RollupFn>('count');
  const [formulaExpr, setFormulaExpr] = useState('');
  const existingSet = useMemo(() => new Set(existingIds), [existingIds]);

  // relation 用: workspace 内の DB 一覧（自分以外を参照先候補に）。
  const dbList = useQuery({
    queryKey: ['db', 'listForWorkspace', workspaceId],
    queryFn: () => trpc.db.listForWorkspace.query({ workspaceId }),
    enabled: kind === 'relation',
  });

  // rollup 用: 選んだ relation 列の参照先 DB の列を取得（対象列の候補に）。
  const relationCols = useMemo(() => columns.filter((c) => c.kind === 'relation'), [columns]);
  const chosenRelCol = relationCols.find((c) => c.id === rollupRelationColumnId);
  const targetDbId = chosenRelCol?.relationDbId;
  const targetDb = useQuery({
    queryKey: ['db', 'get', targetDbId],
    queryFn: () => trpc.db.get.query({ dbId: targetDbId! }),
    enabled: kind === 'rollup' && !!targetDbId,
  });

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (kind === 'relation' && !relationDbId) return;
    if (kind === 'rollup' && (!rollupRelationColumnId || !rollupTargetColumnId)) return;
    if (kind === 'formula' && !formulaExpr.trim()) return;
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
      ...(kind === 'relation' ? { relationDbId } : {}),
      ...(kind === 'rollup'
        ? { rollupRelationColumnId, rollupTargetColumnId, rollupFn }
        : {}),
      ...(kind === 'formula' ? { formulaExpr: formulaExpr.trim() } : {}),
    };
    onAdd(col);
    setName('');
    setOptions('');
    setRelationDbId('');
    setRollupRelationColumnId('');
    setRollupTargetColumnId('');
    setFormulaExpr('');
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
      {kind === 'relation' ? (
        <select
          value={relationDbId}
          onChange={(e) => setRelationDbId(e.currentTarget.value)}
          data-testid="db-add-column-relation-db"
          className="w-40 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">参照先 DB…</option>
          {(dbList.data ?? [])
            .filter((d) => d.id !== currentDbId)
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
        </select>
      ) : null}
      {kind === 'rollup' ? (
        <>
          <select
            value={rollupRelationColumnId}
            onChange={(e) => {
              setRollupRelationColumnId(e.currentTarget.value);
              setRollupTargetColumnId('');
            }}
            data-testid="db-add-column-rollup-rel"
            className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">relation 列…</option>
            {relationCols.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={rollupTargetColumnId}
            onChange={(e) => setRollupTargetColumnId(e.currentTarget.value)}
            disabled={!targetDbId}
            data-testid="db-add-column-rollup-target"
            className="w-32 rounded border border-zinc-300 bg-white px-2 py-1 text-xs disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="">対象列…</option>
            {(targetDb.data?.props.columns ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={rollupFn}
            onChange={(e) => setRollupFn(e.currentTarget.value as RollupFn)}
            data-testid="db-add-column-rollup-fn"
            className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          >
            {ROLLUP_FNS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </>
      ) : null}
      {kind === 'formula' ? (
        <input
          value={formulaExpr}
          onChange={(e) => setFormulaExpr(e.currentTarget.value)}
          placeholder="式 例: {単価} * {数量}"
          title={`他列を {列名} で参照: ${columns.map((c) => c.name).join(', ')}`}
          data-testid="db-add-column-formula"
          className="w-56 rounded border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
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
  if (Array.isArray(value)) return value.length ? `${value.length} 件` : '—';
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
