/**
 * Sidebar のページツリー DnD (PBI-72)。
 *
 * dnd-kit の「フラット化 + 投影 (projection)」方式。ネストしたツリーを
 * 一次元配列に潰し、縦ドラッグで並べ替え・横ドラッグのオフセットで
 * インデント（親の付け替え）を表現する。ドロップ時に「移動後の同階層の
 * 並び」を算出して onMove に渡す（API 側で position を振り直す）。
 *
 * 折りたたみはクライアント状態。ドラッグ中はアクティブ行の子孫を一覧から
 * 隠して、サブツリーごと掴んでいるように見せる。
 */
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

const INDENT = 16;
const MAX_DEPTH = 8;

export type PageRow = {
  id: string;
  parentId: string | null;
  position: string;
  props: unknown;
};

type Node = PageRow & { children: Node[] };

type FlatItem = {
  id: string;
  parentId: string | null;
  depth: number;
  props: unknown;
  childCount: number;
};

function getTitle(p: unknown): string {
  if (p && typeof p === 'object' && 'title' in p) {
    return String((p as { title?: string }).title ?? '無題');
  }
  return '無題';
}

function getIcon(p: unknown): string {
  if (p && typeof p === 'object' && 'icon' in p) {
    const v = (p as { icon?: string }).icon;
    if (typeof v === 'string' && v) return v;
  }
  return '📄';
}

function buildTree(rows: readonly PageRow[]): Node[] {
  const byId = new Map<string, Node>();
  const roots: Node[] = [];
  for (const r of rows) byId.set(r.id, { ...r, children: [] });
  for (const r of rows) {
    const node = byId.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

function flatten(
  nodes: readonly Node[],
  collapsed: ReadonlySet<string>,
  depth = 0,
  parentId: string | null = null,
  out: FlatItem[] = [],
): FlatItem[] {
  for (const n of nodes) {
    out.push({ id: n.id, parentId, depth, props: n.props, childCount: n.children.length });
    if (!collapsed.has(n.id) && n.children.length > 0) {
      flatten(n.children, collapsed, depth + 1, n.id, out);
    }
  }
  return out;
}

/** ドラッグ中: active の子孫を一覧から除外する。 */
function removeChildrenOf(items: readonly FlatItem[], activeId: string): FlatItem[] {
  const excluded = new Set<string>([activeId]);
  const out: FlatItem[] = [];
  for (const item of items) {
    if (item.parentId && excluded.has(item.parentId)) {
      if (item.childCount > 0) excluded.add(item.id);
      continue;
    }
    out.push(item);
  }
  // active 自身は残す（先頭で除外集合に入れたが、親一致では消えない）。
  return out;
}

/** ドロップ位置とドラッグの横オフセットから、投影後の depth / parentId を求める。 */
function getProjection(
  items: readonly FlatItem[],
  activeId: string,
  overId: string,
  dragOffset: number,
): { depth: number; parentId: string | null } | null {
  const overIndex = items.findIndex((i) => i.id === overId);
  const activeIndex = items.findIndex((i) => i.id === activeId);
  const active = items[activeIndex];
  if (overIndex < 0 || activeIndex < 0 || !active) return null;

  const newItems = arrayMove([...items], activeIndex, overIndex);
  const prev = newItems[overIndex - 1];
  const next = newItems[overIndex + 1];

  const dragDepth = Math.round(dragOffset / INDENT);
  const projected = active.depth + dragDepth;
  const maxDepth = prev ? Math.min(prev.depth + 1, MAX_DEPTH) : 0;
  const minDepth = next ? next.depth : 0;
  const depth = projected >= maxDepth ? maxDepth : projected < minDepth ? minDepth : projected;

  const parentId = ((): string | null => {
    if (depth === 0 || !prev) return null;
    if (depth === prev.depth) return prev.parentId;
    if (depth > prev.depth) return prev.id;
    const candidate = newItems
      .slice(0, overIndex)
      .reverse()
      .find((i) => i.depth === depth);
    return candidate?.parentId ?? null;
  })();

  return { depth, parentId };
}

export function SortablePageTree({
  pages,
  onNavigate,
  onMove,
}: {
  pages: readonly PageRow[];
  onNavigate?: () => void;
  onMove: (pageId: string, newParentId: string | null, orderedSiblingIds: string[]) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [offsetLeft, setOffsetLeft] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const flat = useMemo(() => flatten(buildTree(pages), collapsed), [pages, collapsed]);
  const visible = useMemo(
    () => (activeId ? removeChildrenOf(flat, activeId) : flat),
    [flat, activeId],
  );
  const ids = useMemo(() => visible.map((i) => i.id), [visible]);
  const projected =
    activeId && overId ? getProjection(visible, activeId, overId, offsetLeft) : null;

  const reset = () => {
    setActiveId(null);
    setOverId(null);
    setOffsetLeft(0);
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
    setOverId(String(e.active.id));
  };
  const handleDragMove = (e: DragMoveEvent) => setOffsetLeft(e.delta.x);
  const handleDragOver = (e: DragOverEvent) => setOverId(e.over ? String(e.over.id) : null);
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    const proj = over ? getProjection(visible, String(active.id), String(over.id), offsetLeft) : null;
    reset();
    if (!over || !proj) return;
    const clone = visible.map((i) => ({ ...i }));
    const activeIndex = clone.findIndex((i) => i.id === active.id);
    const overIndex = clone.findIndex((i) => i.id === over.id);
    const moved = clone[activeIndex];
    if (activeIndex < 0 || overIndex < 0 || !moved) return;
    clone[activeIndex] = { ...moved, parentId: proj.parentId, depth: proj.depth };
    const sorted = arrayMove(clone, activeIndex, overIndex);
    const siblings = sorted.filter((i) => i.parentId === proj.parentId).map((i) => i.id);
    if (siblings.length === 0) return;
    onMove(String(active.id), proj.parentId, siblings);
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-0.5">
          {visible.map((item) => (
            <SortableTreeItem
              key={item.id}
              item={item}
              depth={item.id === activeId && projected ? projected.depth : item.depth}
              collapsed={collapsed.has(item.id)}
              onToggle={() => toggle(item.id)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableTreeItem({
  item,
  depth,
  collapsed,
  onToggle,
  onNavigate,
}: {
  item: FlatItem;
  depth: number;
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style} data-testid={`sidebar-tree-li-${item.id}`}>
      <div
        className="group flex items-center gap-0.5 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800"
        style={{ paddingLeft: depth * INDENT }}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="ドラッグして移動"
          data-testid={`sidebar-tree-handle-${item.id}`}
          className="flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-xs text-zinc-300 opacity-0 hover:text-zinc-600 active:cursor-grabbing group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-zinc-300"
        >
          ⠿
        </button>
        {item.childCount > 0 ? (
          <button
            type="button"
            onClick={onToggle}
            data-testid={`sidebar-tree-toggle-${item.id}`}
            aria-label={collapsed ? '展開する' : '折りたたむ'}
            aria-expanded={!collapsed}
            className="flex h-5 w-5 shrink-0 items-center justify-center text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            {collapsed ? '▸' : '▾'}
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <Link
          to="/p/$pageId"
          params={{ pageId: item.id }}
          data-testid={`sidebar-page-${item.id}`}
          onClick={onNavigate}
          className="flex min-h-9 flex-1 items-center gap-2 rounded-md px-1 py-1.5"
        >
          <span className="w-4 text-center text-xs">{getIcon(item.props)}</span>
          <span className="min-w-0 truncate text-sm">{getTitle(item.props)}</span>
        </Link>
      </div>
    </li>
  );
}
