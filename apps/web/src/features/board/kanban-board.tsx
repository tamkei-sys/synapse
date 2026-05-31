/**
 * 汎用カンバンボード (PBI-82: ドラッグ&ドロップ対応)。
 *
 * status を列にして items を振り分ける。カードは列間をドラッグして移動でき、
 * ドロップ先の列の status に onChangeStatus で変更する。ドラッグできない環境
 * （a11y / テスト）向けに各カードの select も残す。PBI 専用ボードとは別に、
 * project / sprint の一覧・配下ビューで再利用する汎用版。
 */
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import type { ReactNode } from 'react';

export type KanbanColumn = { value: string; label: string };

/**
 * ドラッグ終了時に「どの item をどの status へ移すか」を決める純粋関数 (PBI-82)。
 * over が無い / item 不明 / 同じ列 なら null（= 変更なし）。テスト対象。
 */
export function resolveDrop<T>(
  items: readonly T[],
  activeId: string,
  overId: string | null,
  getId: (item: T) => string,
  getStatus: (item: T) => string,
): { item: T; status: string } | null {
  if (overId == null) return null;
  const item = items.find((it) => getId(it) === activeId);
  if (!item) return null;
  if (getStatus(item) === overId) return null;
  return { item, status: overId };
}

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
  // 小さなドラッグ閾値で、カード内の select / リンクのクリックを邪魔しない。
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragEnd = (e: DragEndEvent) => {
    const drop = resolveDrop(
      items,
      String(e.active.id),
      e.over?.id == null ? null : String(e.over.id),
      getId,
      getStatus,
    );
    if (drop) onChangeStatus(drop.item, drop.status);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2" data-testid="kanban-board">
        {columns.map((col) => (
          <KanbanColumnDroppable key={col.value} value={col.value}>
            <h3 className="mb-2 flex items-center justify-between px-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
              <span>{col.label}</span>
              <span
                data-testid={`kanban-col-count-${col.value}`}
                className="rounded-full bg-zinc-200 px-1.5 text-[10px] text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
              >
                {items.filter((it) => getStatus(it) === col.value).length}
              </span>
            </h3>
            <div className="flex min-h-12 flex-col gap-2">
              {items
                .filter((it) => getStatus(it) === col.value)
                .map((it) => (
                  <KanbanCard key={getId(it)} id={getId(it)}>
                    {renderCard(it)}
                    <select
                      value={getStatus(it)}
                      onChange={(e) => onChangeStatus(it, e.target.value)}
                      onPointerDown={(e) => e.stopPropagation()}
                      data-testid={`kanban-card-status-${getId(it)}`}
                      className="mt-2 w-full rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      {columns.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </KanbanCard>
                ))}
              {items.filter((it) => getStatus(it) === col.value).length === 0 ? (
                <p className="px-1 py-4 text-center text-xs text-zinc-400">—</p>
              ) : null}
            </div>
          </KanbanColumnDroppable>
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumnDroppable({ value, children }: { value: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: value });
  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-col-${value}`}
      data-over={isOver}
      className={`flex min-w-60 flex-1 flex-col rounded-lg border p-2 transition-colors ${
        isOver
          ? 'border-violet-400 bg-violet-50/60 dark:border-violet-600 dark:bg-violet-900/20'
          : 'border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/30'
      }`}
    >
      {children}
    </div>
  );
}

function KanbanCard({ id, children }: { id: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  return (
    <div
      ref={setNodeRef}
      data-testid={`kanban-card-${id}`}
      style={transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined}
      className={`rounded-md border border-zinc-200 bg-white p-2 text-sm shadow-sm dark:border-zinc-700 dark:bg-zinc-900 ${
        isDragging ? 'opacity-50' : ''
      }`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}
