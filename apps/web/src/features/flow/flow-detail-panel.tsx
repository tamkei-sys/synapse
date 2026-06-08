/**
 * Right-side node detail panel, opened by clicking a node. Shows the node's
 * category, subtitle, tags, description, implementation code/formula, and
 * source path. Closes on the × button or Escape.
 */
import { useEffect } from 'react';

import type { FlowCategory, FlowNode } from '@synapse/blocks';

type Props = {
  node: FlowNode;
  category: FlowCategory | undefined;
  onClose: () => void;
};

export function FlowDetailPanel({ node, category, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      data-testid="flow-detail-panel"
      className="absolute right-0 top-0 z-20 flex h-full w-[300px] max-w-[85%] flex-col overflow-y-auto border-l border-zinc-700/70 bg-zinc-900/95 p-4 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-zinc-50">{node.label}</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-700/70 hover:text-zinc-100"
        >
          ✕
        </button>
      </div>

      {category ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: category.color }} aria-hidden />
          {category.label}
        </div>
      ) : null}

      {node.subtitle ? <p className="mt-2 text-xs text-zinc-400">{node.subtitle}</p> : null}

      {node.tags && node.tags.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {node.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300"
            >
              {t}
            </span>
          ))}
        </div>
      ) : null}

      {node.description ? (
        <p className="mt-3 whitespace-pre-line text-xs leading-relaxed text-zinc-200">
          {node.description}
        </p>
      ) : null}

      {node.code ? (
        <div className="mt-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            実装コード
          </p>
          <pre className="overflow-auto rounded bg-zinc-950/80 p-2.5 font-mono text-[11px] leading-relaxed text-emerald-300">
            {node.code}
          </pre>
        </div>
      ) : null}

      {node.sourcePath ? (
        <p className="mt-auto pt-3 font-mono text-[10px] text-zinc-500">{node.sourcePath}</p>
      ) : null}
    </aside>
  );
}
