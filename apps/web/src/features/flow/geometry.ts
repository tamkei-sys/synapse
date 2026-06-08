/**
 * Pure geometry for the flow canvas: fixed node box size, bounding-box of a
 * graph, edge anchor points, and the cubic-bezier path connecting two nodes.
 *
 * The canvas works in an abstract "world" coordinate space; a single CSS
 * transform (translate + scale) maps world → screen, so everything here is
 * plain math with no DOM dependency (and is unit-testable in isolation).
 */
import type { FlowNode } from '@synapse/blocks';

export const NODE_W = 184;
export const NODE_H = 60;

export type Pt = { x: number; y: number };
export type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
};

/** Axis-aligned bounding box covering every node box. */
export function flowBounds(nodes: readonly Pick<FlowNode, 'x' | 'y'>[]): Bounds {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: NODE_W, maxY: NODE_H, width: NODE_W, height: NODE_H };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + NODE_W);
    maxY = Math.max(maxY, n.y + NODE_H);
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** Right-center of a node — where outgoing edges begin (left→right flow). */
export function sourceAnchor(n: Pick<FlowNode, 'x' | 'y'>): Pt {
  return { x: n.x + NODE_W, y: n.y + NODE_H / 2 };
}

/** Left-center of a node — where incoming edges land. */
export function targetAnchor(n: Pick<FlowNode, 'x' | 'y'>): Pt {
  return { x: n.x, y: n.y + NODE_H / 2 };
}

/** Smooth horizontal-biased cubic bezier between two anchor points. */
export function edgePath(s: Pt, t: Pt): string {
  const dx = Math.max(36, Math.abs(t.x - s.x) * 0.45);
  return `M ${round(s.x)},${round(s.y)} C ${round(s.x + dx)},${round(s.y)} ${round(t.x - dx)},${round(t.y)} ${round(t.x)},${round(t.y)}`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
