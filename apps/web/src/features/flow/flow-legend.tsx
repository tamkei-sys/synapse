/**
 * Bottom-left legend: one row per category with its color swatch. Overlay —
 * not part of the panned/zoomed world. Scrolls if a flow has many categories.
 */
import type { FlowCategory } from '@synapse/blocks';

export function FlowLegend({ categories }: { categories: readonly FlowCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <div className="absolute bottom-3 left-3 z-10 max-h-[45%] overflow-y-auto rounded-md border border-zinc-700/70 bg-zinc-900/80 p-2.5 backdrop-blur-sm">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">凡例</p>
      <ul className="space-y-1">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2 text-[11px] text-zinc-200">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: c.color }}
              aria-hidden
            />
            <span className="truncate">{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
