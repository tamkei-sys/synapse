/**
 * A single node card, absolutely positioned in world coordinates.
 *
 * Visual states layer up: a category-colored left rail always; a colored glow
 * + slight scale when "lit" (active in the current playback step); a violet
 * ring when selected; dim + grayscale when playback is running but this node
 * isn't part of the active step. `pointerdown` is stopped so clicking a node
 * selects it instead of starting a background pan.
 */
import { memo, type PointerEvent as ReactPointerEvent } from 'react';

import type { FlowNode } from '@synapse/blocks';

import { NODE_H, NODE_W } from './geometry.js';

type Props = {
  node: FlowNode;
  color: string;
  selected: boolean;
  lit: boolean;
  dimmed: boolean;
  onSelect: (id: string) => void;
};

function FlowNodeCardImpl({ node, color, selected, lit, dimmed, onSelect }: Props) {
  return (
    <div
      data-testid={`flow-node-${node.id}`}
      data-flow-node=""
      data-lit={lit ? '1' : undefined}
      onPointerDown={(e: ReactPointerEvent) => e.stopPropagation()}
      onClick={(e) => {
        // Don't let the click bubble to the background (which deselects).
        e.stopPropagation();
        onSelect(node.id);
      }}
      style={{
        left: node.x,
        top: node.y,
        width: NODE_W,
        minHeight: NODE_H,
        borderLeftColor: color,
        boxShadow: lit ? `0 0 0 2px ${color}, 0 0 22px ${color}66` : undefined,
      }}
      className={[
        'absolute flex cursor-pointer select-none flex-col justify-center rounded-md border border-l-4 px-3 py-2 text-left',
        'border-zinc-700 bg-zinc-900/90 backdrop-blur-sm transition-all duration-300',
        lit ? 'scale-[1.04] bg-zinc-800/95' : '',
        dimmed ? 'opacity-30 grayscale' : 'opacity-100',
        selected ? 'ring-2 ring-violet-400' : '',
      ].join(' ')}
    >
      <span className="line-clamp-2 text-[13px] font-medium leading-tight text-zinc-100">
        {node.label}
      </span>
      {node.subtitle ? (
        <span className="mt-0.5 line-clamp-1 text-[10px] text-zinc-400">{node.subtitle}</span>
      ) : null}
    </div>
  );
}

export const FlowNodeCard = memo(FlowNodeCardImpl);
