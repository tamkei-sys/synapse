/**
 * SVG edge layer, rendered under the node cards inside the same transformed
 * world. Edges are horizontal-biased beziers with an arrowhead. During
 * playback, an edge whose endpoints are both lit is highlighted; other edges
 * dim, mirroring the node treatment.
 */
import { memo } from 'react';

import type { FlowEdge, FlowNode } from '@synapse/blocks';

import { edgePath, sourceAnchor, targetAnchor, type Bounds } from './geometry.js';

type Props = {
  edges: readonly FlowEdge[];
  nodeById: Map<string, FlowNode>;
  bounds: Bounds;
  litNodeIds: ReadonlySet<string>;
  playing: boolean;
};

function FlowEdgesImpl({ edges, nodeById, bounds, litNodeIds, playing }: Props) {
  return (
    <svg
      width={Math.max(1, bounds.maxX + 80)}
      height={Math.max(1, bounds.maxY + 80)}
      className="pointer-events-none absolute left-0 top-0 overflow-visible"
      aria-hidden
    >
      <defs>
        <marker
          id="flow-arrow"
          markerWidth="9"
          markerHeight="9"
          refX="7"
          refY="4.5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L9,4.5 L0,9 z" className="fill-zinc-600" />
        </marker>
        <marker
          id="flow-arrow-lit"
          markerWidth="9"
          markerHeight="9"
          refX="7"
          refY="4.5"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L9,4.5 L0,9 z" className="fill-violet-400" />
        </marker>
      </defs>
      {edges.map((e) => {
        const s = nodeById.get(e.source);
        const t = nodeById.get(e.target);
        if (!s || !t) return null;
        const lit = playing && litNodeIds.has(e.source) && litNodeIds.has(e.target);
        const dim = playing && !lit;
        return (
          <path
            key={e.id}
            data-testid={`flow-edge-${e.id}`}
            d={edgePath(sourceAnchor(s), targetAnchor(t))}
            fill="none"
            className={lit ? 'stroke-violet-400' : 'stroke-zinc-600'}
            style={{
              strokeWidth: lit ? 2.5 : 1.5,
              opacity: dim ? 0.2 : 0.9,
              transition: 'opacity .3s ease, stroke-width .3s ease',
            }}
            markerEnd={`url(#${lit ? 'flow-arrow-lit' : 'flow-arrow'})`}
          />
        );
      })}
    </svg>
  );
}

export const FlowEdges = memo(FlowEdgesImpl);
