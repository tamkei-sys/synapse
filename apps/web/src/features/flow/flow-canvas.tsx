/**
 * FlowCanvas — the embeddable node-graph stage.
 *
 * Composes the transformed world (SVG edges + HTML node cards) with the
 * non-transformed overlays (title, transport controls, legend, minimap, STEP
 * indicator, node detail panel). State is owned by two hooks: `usePanZoom`
 * (view transform) and `useStepPlayer` (execution-order playback). The stage
 * is an intentionally dark surface in both themes — a visualization canvas,
 * like a media player — so the data-driven category colors read consistently.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { effectiveSteps, type FlowDoc } from '@synapse/blocks';

import { flowBounds } from './geometry.js';
import { FlowControls } from './flow-controls.js';
import { FlowDetailPanel } from './flow-detail-panel.js';
import { FlowEdges } from './flow-edges.js';
import { FlowLegend } from './flow-legend.js';
import { FlowMinimap } from './flow-minimap.js';
import { FlowNodeCard } from './flow-node-card.js';
import { FlowStepBar } from './flow-step-bar.js';
import { usePanZoom } from './use-pan-zoom.js';
import { useStepPlayer } from './use-step-player.js';

const SPEEDS = [0.5, 1, 2] as const;
const FALLBACK_COLOR = '#71717a'; // zinc-500

export type FlowCanvasProps = {
  doc: FlowDoc;
  className?: string;
  /** Fixed stage height in px (default 480). */
  height?: number;
};

export function FlowCanvas({ doc, className, height = 480 }: FlowCanvasProps) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const nodeById = useMemo(() => new Map(doc.nodes.map((n) => [n.id, n])), [doc.nodes]);
  const catById = useMemo(() => new Map(doc.categories.map((c) => [c.id, c])), [doc.categories]);
  const steps = useMemo(() => effectiveSteps(doc), [doc]);
  const bounds = useMemo(() => flowBounds(doc.nodes), [doc.nodes]);

  const colorOf = (categoryId: string): string => catById.get(categoryId)?.color ?? FALLBACK_COLOR;

  const pz = usePanZoom(frameRef, bounds);
  const player = useStepPlayer(steps.length);

  // A step is "active" whenever the indicator is showing — highlight/dim even
  // while paused on a step, not only during auto-advance.
  const stepActive = player.index >= 0;
  const activeStep = stepActive ? (steps[player.index] ?? null) : null;
  const litNodeIds = useMemo<ReadonlySet<string>>(
    () => new Set(activeStep?.nodeIds ?? []),
    [activeStep],
  );

  // Measure the frame (minimap viewport + fit math).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setFrame({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Frame the whole graph once measured and whenever the graph changes.
  const fit = pz.fit;
  useEffect(() => {
    if (frame.w > 0) fit();
  }, [fit, frame.w, frame.h]);

  const selected = selectedId ? (nodeById.get(selectedId) ?? null) : null;

  const cycleSpeed = (): void => {
    const i = SPEEDS.indexOf(player.speed as (typeof SPEEDS)[number]);
    player.setSpeed(SPEEDS[(i + 1) % SPEEDS.length] ?? 1);
  };

  return (
    <div
      className={[
        'not-prose relative w-full overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-100',
        className ?? '',
      ].join(' ')}
      style={{ height }}
    >
      {/* dotted-grid backdrop */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'radial-gradient(circle, #3f3f46 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
        aria-hidden
      />

      {/* pan surface (sits behind the overlays; owns the world) */}
      <div
        ref={frameRef}
        data-testid="flow-canvas"
        className={`absolute inset-0 ${pz.panning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={pz.onBackgroundPointerDown}
        onPointerMove={pz.onBackgroundPointerMove}
        onPointerUp={pz.onBackgroundPointerUp}
        onClick={() => setSelectedId(null)}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${pz.view.x}px, ${pz.view.y}px) scale(${pz.view.k})` }}
        >
          <FlowEdges
            edges={doc.edges}
            nodeById={nodeById}
            bounds={bounds}
            litNodeIds={litNodeIds}
            playing={stepActive}
          />
          {doc.nodes.map((n) => (
            <FlowNodeCard
              key={n.id}
              node={n}
              color={colorOf(n.categoryId)}
              selected={selectedId === n.id}
              lit={stepActive && litNodeIds.has(n.id)}
              dimmed={stepActive && !litNodeIds.has(n.id)}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </div>

      {doc.title ? (
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[55%]">
          <h3 className="truncate text-sm font-bold text-zinc-100">{doc.title}</h3>
          {doc.subtitle ? (
            <p className="truncate text-[11px] text-zinc-400">{doc.subtitle}</p>
          ) : null}
        </div>
      ) : null}

      <FlowControls
        playing={player.playing}
        hasSteps={steps.length > 0}
        speed={player.speed}
        onToggle={player.toggle}
        onPrev={player.prev}
        onNext={player.next}
        onReset={player.reset}
        onCycleSpeed={cycleSpeed}
        onFit={pz.fit}
        onZoomIn={pz.zoomIn}
        onZoomOut={pz.zoomOut}
      />

      <FlowLegend categories={doc.categories} />
      <FlowMinimap
        nodes={doc.nodes}
        colorOf={colorOf}
        bounds={bounds}
        view={pz.view}
        frame={frame}
      />
      <FlowStepBar step={activeStep} index={player.index} total={steps.length} />
      {selected ? (
        <FlowDetailPanel
          node={selected}
          category={catById.get(selected.categoryId)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
