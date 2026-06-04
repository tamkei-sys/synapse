/**
 * Bottom-right minimap: the whole graph scaled to a thumbnail, with a violet
 * rectangle marking the currently-visible viewport. Read-only overview (no
 * click-to-pan yet — a follow-up).
 */
import type { FlowNode } from '@synapse/blocks';

import { NODE_H, NODE_W, type Bounds } from './geometry.js';
import type { View } from './use-pan-zoom.js';

const MM_W = 168;
const MM_H = 112;
const PAD = 6;

type Props = {
  nodes: readonly FlowNode[];
  colorOf: (categoryId: string) => string;
  bounds: Bounds;
  view: View;
  frame: { w: number; h: number };
};

export function FlowMinimap({ nodes, colorOf, bounds, view, frame }: Props) {
  if (nodes.length === 0) return null;
  const s = Math.min(
    (MM_W - PAD * 2) / Math.max(1, bounds.width),
    (MM_H - PAD * 2) / Math.max(1, bounds.height),
  );
  const mmX = (x: number): number => PAD + (x - bounds.minX) * s;
  const mmY = (y: number): number => PAD + (y - bounds.minY) * s;

  // Visible world rectangle (screen 0..frame mapped back through the view).
  const vx0 = mmX(-view.x / view.k);
  const vy0 = mmY(-view.y / view.k);
  const vw = (frame.w / view.k) * s;
  const vh = (frame.h / view.k) * s;

  return (
    <div className="absolute bottom-3 right-3 z-10 overflow-hidden rounded-md border border-zinc-700/70 bg-zinc-950/80 backdrop-blur-sm">
      <svg width={MM_W} height={MM_H} aria-hidden data-testid="flow-minimap">
        {nodes.map((n) => (
          <rect
            key={n.id}
            x={mmX(n.x)}
            y={mmY(n.y)}
            width={Math.max(2, NODE_W * s)}
            height={Math.max(2, NODE_H * s)}
            rx={1.5}
            fill={colorOf(n.categoryId)}
            opacity={0.85}
          />
        ))}
        <rect
          x={vx0}
          y={vy0}
          width={vw}
          height={vh}
          fill="none"
          className="stroke-violet-400"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
