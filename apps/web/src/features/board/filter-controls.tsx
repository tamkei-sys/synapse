/**
 * 汎用フィルタ UI。
 *
 * 各項目を select で「すべて / 値」で絞り込む。value は key→選択値（'' は全件）。
 * 一覧画面（PBI / project / sprint）で共通利用する。絞り込みロジックは
 * applyItemFilters（純粋関数）に委ねる。
 */
export type FilterDef = {
  key: string;
  label: string;
  options: readonly { value: string; label: string }[];
};

export type FilterValue = Record<string, string>;

export function FilterControls({
  filters,
  value,
  onChange,
}: {
  filters: readonly FilterDef[];
  value: FilterValue;
  onChange: (next: FilterValue) => void;
}) {
  const active = Object.values(value).some((v) => v);
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="filter-controls">
      {filters.map((f) => (
        <select
          key={f.key}
          value={value[f.key] ?? ''}
          onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
          data-testid={`filter-${f.key}`}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="">{f.label}：すべて</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {active ? (
        <button
          type="button"
          onClick={() => onChange({})}
          data-testid="filter-clear"
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-violet-600 dark:hover:text-violet-300"
        >
          クリア
        </button>
      ) : null}
    </div>
  );
}

/**
 * items を、各 filter key の選択値で AND 絞り込みする純粋関数。
 * getField(item, key) が項目の現在値を返す。選択値が '' のキーは無視。
 */
export function applyItemFilters<T>(
  items: readonly T[],
  value: FilterValue,
  getField: (item: T, key: string) => string,
): T[] {
  const active = Object.entries(value).filter(([, v]) => v);
  if (active.length === 0) return [...items];
  return items.filter((it) => active.every(([key, v]) => getField(it, key) === v));
}
