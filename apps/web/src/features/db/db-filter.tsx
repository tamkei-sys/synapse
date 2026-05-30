/**
 * user-defined DB のフィルタ / ソート (PBI-62)。
 *
 * 行は既に全件 fetch 済み（db.get）なのでクライアント側で絞り込み・並べ替え
 * する。テーブル / ボード / ギャラリーの全ビューで共通に適用される。
 *
 * グループ化は Board ビューが select 列で担うので、ここでは filter + sort
 * のみを提供する。
 */
import { useState } from 'react';

import type { DbCellValue, DbColumn, DbColumnKind } from '@synapse/blocks';

export type DbRowLike = { id: string; props: { values: Record<string, DbCellValue> } };

export type FilterOp = 'contains' | 'eq' | 'neq' | 'gt' | 'lt' | 'checked' | 'unchecked';
export type FilterRule = { id: string; columnId: string; op: FilterOp; value: string };
export type SortState = { columnId: string; dir: 'asc' | 'desc' } | null;

const OP_LABEL: Record<FilterOp, string> = {
  contains: '含む',
  eq: '一致',
  neq: '不一致',
  gt: 'より大',
  lt: 'より小',
  checked: 'ON',
  unchecked: 'OFF',
};

function opsForKind(kind: DbColumnKind): FilterOp[] {
  switch (kind) {
    case 'text':
      return ['contains', 'eq', 'neq'];
    case 'select':
      return ['eq', 'neq'];
    case 'number':
      return ['eq', 'neq', 'gt', 'lt'];
    case 'date':
      return ['eq', 'gt', 'lt'];
    case 'checkbox':
      return ['checked', 'unchecked'];
    default:
      return ['contains'];
  }
}

function evalRule(cell: DbCellValue, rule: FilterRule, kind: DbColumnKind): boolean {
  switch (rule.op) {
    case 'checked':
      return cell === true;
    case 'unchecked':
      return cell !== true;
    case 'contains':
      return String(cell ?? '')
        .toLowerCase()
        .includes(rule.value.toLowerCase());
    case 'eq':
      if (kind === 'number') return Number(cell) === Number(rule.value);
      return String(cell ?? '') === rule.value;
    case 'neq':
      if (kind === 'number') return Number(cell) !== Number(rule.value);
      return String(cell ?? '') !== rule.value;
    case 'gt':
      if (kind === 'number') return Number(cell) > Number(rule.value);
      return String(cell ?? '') > rule.value; // date は ISO 文字列比較で OK
    case 'lt':
      if (kind === 'number') return Number(cell) < Number(rule.value);
      return String(cell ?? '') < rule.value;
    default:
      return true;
  }
}

export function applyFilterSort<T extends DbRowLike>(
  rows: readonly T[],
  columns: readonly DbColumn[],
  rules: readonly FilterRule[],
  sort: SortState,
): T[] {
  const byId = new Map(columns.map((c) => [c.id, c]));
  let out = rows.filter((r) =>
    rules.every((rule) => {
      const col = byId.get(rule.columnId);
      if (!col) return true;
      // checked/unchecked 以外で値が空なら無効ルールとして素通り。
      if (rule.value === '' && rule.op !== 'checked' && rule.op !== 'unchecked') return true;
      return evalRule(r.props.values[rule.columnId] ?? null, rule, col.kind);
    }),
  );
  if (sort) {
    const col = byId.get(sort.columnId);
    const factor = sort.dir === 'asc' ? 1 : -1;
    out = [...out].sort((a, b) => {
      const va = a.props.values[sort.columnId];
      const vb = b.props.values[sort.columnId];
      if (col?.kind === 'number') return ((Number(va) || 0) - (Number(vb) || 0)) * factor;
      return String(va ?? '').localeCompare(String(vb ?? ''), 'ja') * factor;
    });
  }
  return out;
}

/** filter/sort 状態を保持する hook。 */
export function useDbFilterSort(): {
  rules: FilterRule[];
  setRules: (r: FilterRule[]) => void;
  sort: SortState;
  setSort: (s: SortState) => void;
} {
  const [rules, setRules] = useState<FilterRule[]>([]);
  const [sort, setSort] = useState<SortState>(null);
  return { rules, setRules, sort, setSort };
}

let ruleSeq = 0;

export function DbControls({
  columns,
  rules,
  setRules,
  sort,
  setSort,
}: {
  columns: readonly DbColumn[];
  rules: FilterRule[];
  setRules: (r: FilterRule[]) => void;
  sort: SortState;
  setSort: (s: SortState) => void;
}) {
  const firstCol = columns[0];
  const addRule = () => {
    if (!firstCol) return;
    ruleSeq += 1;
    setRules([
      ...rules,
      {
        id: `r${ruleSeq}`,
        columnId: firstCol.id,
        op: opsForKind(firstCol.kind)[0] ?? 'contains',
        value: '',
      },
    ]);
  };
  const update = (id: string, patch: Partial<FilterRule>) =>
    setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRules(rules.filter((r) => r.id !== id));

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs" data-testid="db-controls">
      {rules.map((rule) => {
        const col = columns.find((c) => c.id === rule.columnId);
        const ops: FilterOp[] = col ? opsForKind(col.kind) : ['contains'];
        const needsValue = rule.op !== 'checked' && rule.op !== 'unchecked';
        return (
          <span
            key={rule.id}
            data-testid={`db-filter-rule-${rule.id}`}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-1 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <select
              value={rule.columnId}
              onChange={(e) => {
                const c = columns.find((x) => x.id === e.currentTarget.value);
                update(rule.id, {
                  columnId: e.currentTarget.value,
                  op: c ? (opsForKind(c.kind)[0] ?? 'contains') : 'contains',
                });
              }}
              className="rounded bg-transparent"
            >
              {columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={rule.op}
              onChange={(e) => update(rule.id, { op: e.currentTarget.value as FilterOp })}
              className="rounded bg-transparent"
            >
              {ops.map((o) => (
                <option key={o} value={o}>
                  {OP_LABEL[o]}
                </option>
              ))}
            </select>
            {needsValue ? (
              col?.kind === 'select' ? (
                <select
                  value={rule.value}
                  onChange={(e) => update(rule.id, { value: e.currentTarget.value })}
                  className="rounded border border-zinc-300 bg-white px-1 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <option value="">—</option>
                  {(col.options ?? []).map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={rule.value}
                  onChange={(e) => update(rule.id, { value: e.currentTarget.value })}
                  type={col?.kind === 'number' ? 'number' : col?.kind === 'date' ? 'date' : 'text'}
                  placeholder="値"
                  className="w-20 rounded border border-zinc-300 bg-white px-1 dark:border-zinc-700 dark:bg-zinc-950"
                />
              )
            ) : null}
            <button
              type="button"
              onClick={() => remove(rule.id)}
              aria-label="フィルタ削除"
              className="text-zinc-400 hover:text-red-500"
            >
              ×
            </button>
          </span>
        );
      })}
      <button
        type="button"
        onClick={addRule}
        data-testid="db-add-filter"
        className="rounded-md border border-dashed border-zinc-300 px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
      >
        + フィルタ
      </button>

      <span className="ml-2 inline-flex items-center gap-1">
        <span className="text-zinc-400">ソート:</span>
        <select
          value={sort?.columnId ?? ''}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setSort(v ? { columnId: v, dir: sort?.dir ?? 'asc' } : null);
          }}
          data-testid="db-sort-col"
          className="rounded border border-zinc-300 bg-white px-1 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">なし</option>
          {columns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {sort ? (
          <button
            type="button"
            onClick={() => setSort({ ...sort, dir: sort.dir === 'asc' ? 'desc' : 'asc' })}
            data-testid="db-sort-dir"
            className="rounded border border-zinc-300 px-1 dark:border-zinc-700"
          >
            {sort.dir === 'asc' ? '昇順 ↑' : '降順 ↓'}
          </button>
        ) : null}
      </span>
    </div>
  );
}
