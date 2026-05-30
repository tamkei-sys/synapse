/**
 * 汎用カンバンボード。
 *
 * status を列にして items を振り分け、各カードの select でステータスを変更する
 * （ドラッグ操作は将来）。PBI 専用の既存ボードとは別に、project / sprint の
 * 一覧ビューで再利用する汎用版。renderCard で各ドメインの見た目を差し込む。
 */
import type { ReactNode } from 'react';

export type KanbanColumn = { value: string; label: string };

type KanbanBoardProps<T> = {
  items: readonly T[];
  columns: readonly KanbanColumn[];
  getId: (item: T) => string;
  getStatus: (item: T) => string;
  onChangeStatus: (item: T, status: string) => void;
  renderCard: (item: T) => ReactNode;
};

export function KanbanBoard<T>({
  items,
  columns,
  getId,
  getStatus,
  onChangeStatus,
  renderCard,
}: KanbanBoardProps<T>) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" data-testid="kanban-board">
      {columns.map((col) => {
        const colItems = items.filter((it) => getStatus(it) === col.value);
        return (
          <div
            key={col.value}
            data-testid={`kanban-col-${col.value}`}
            className="flex min-w-60 flex-1 flex-col rounded-lg border border-zinc-200 bg-zinc-50/60 p-2 dark:border-zinc-800 dark:bg-zinc-900/30"
          >
            <h3 className="mb-2 flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span>{col.label}</span>
              <span
                data-testid={`kanban-col-count-${col.value}`}
                className="rounded-full bg-zinc-200 px-1.5 text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              >
                {colItems.length}
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {colItems.map((it) => (
                <div
                  key={getId(it)}
                  data-testid={`kanban-card-${getId(it)}`}
                  className="rounded-md border border-zinc-200 bg-white p-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {renderCard(it)}
                  <select
                    value={getStatus(it)}
                    onChange={(e) => onChangeStatus(it, e.target.value)}
                    data-testid={`kanban-card-status-${getId(it)}`}
                    className="mt-2 w-full rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                  >
                    {columns.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              {colItems.length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-zinc-400">—</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
