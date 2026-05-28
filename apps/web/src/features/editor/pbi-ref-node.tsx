/**
 * `pbiRef` — an atomic inline TipTap node that points at a PBI block.
 *
 * The node is data-only (just a `pbiId` attr). The visible chip is a
 * React NodeView that subscribes to TanStack Query's `pbi.get` so the
 * title + status stay current even if the PBI moves on the board in
 * another tab. Clicking the chip cycles to the next status — the same
 * "primary action" as the Kanban board — so a single test path covers
 * editor and board surfaces.
 *
 * The node is wrapped in a span with role="link" so screen readers
 * announce it as a reference, not a meaningless mark.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

import { nextStatus, type PbiStatus } from '@synapse/blocks';

import { trpc } from '../../lib/trpc.js';

declare module '@tiptap/core' {
  // CLAUDE.md §4 permits `interface` for declaration merging — exactly
  // what TipTap's Commands augmentation requires.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    pbiRef: {
      insertPbiRef: (pbiId: string) => ReturnType;
    };
  }
}

export const PbiRefNode = Node.create({
  name: 'pbiRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      pbiId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-pbi-id') ?? '',
        renderHTML: (attrs) => ({ 'data-pbi-id': attrs['pbiId'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-pbi-ref]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-pbi-ref': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PbiRefView);
  },

  addCommands() {
    return {
      insertPbiRef:
        (pbiId: string) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { pbiId } })
            // Land the caret after the inserted node so typing continues.
            .insertContent(' ')
            .run(),
    };
  },
});

function PbiRefView({ node }: ReactNodeViewProps) {
  const pbiId = String(node.attrs['pbiId'] ?? '');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pbi', 'get', pbiId],
    queryFn: () => trpc.pbi.get.query({ pbiId }),
    enabled: !!pbiId,
  });

  const cycleStatus = useMutation({
    mutationFn: () => {
      const current =
        (query.data?.props as { status?: PbiStatus } | undefined)?.status ?? 'backlog';
      return trpc.pbi.update.mutate({
        pbiId,
        patch: { status: nextStatus(current) },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['pbi', 'get', pbiId] });
      await queryClient.invalidateQueries({ queryKey: ['pbi', 'list'] });
    },
  });

  const props = query.data?.props as { title?: string; status?: PbiStatus } | undefined;
  const title = props?.title ?? (query.isPending ? 'Loading…' : 'Unknown PBI');
  const status: PbiStatus = props?.status ?? 'backlog';

  return (
    <NodeViewWrapper
      as="span"
      data-testid={`pbi-ref-${pbiId}`}
      data-pbi-id={pbiId}
      className="not-prose inline-flex select-none items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 align-baseline text-sm dark:border-zinc-700 dark:bg-zinc-800"
      contentEditable={false}
    >
      <StatusDot status={status} />
      <span className="font-medium">{title}</span>
      <button
        type="button"
        onClick={() => cycleStatus.mutate()}
        disabled={cycleStatus.isPending}
        data-testid={`pbi-ref-status-${pbiId}`}
        className="ml-1 rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs uppercase tracking-wide hover:bg-zinc-300 dark:bg-zinc-700 dark:hover:bg-zinc-600"
      >
        {status}
      </button>
    </NodeViewWrapper>
  );
}

function StatusDot({ status }: { status: PbiStatus }) {
  const tone =
    status === 'done'
      ? 'bg-emerald-500'
      : status === 'in_progress'
        ? 'bg-amber-500'
        : status === 'review'
          ? 'bg-violet-500'
          : status === 'ready'
            ? 'bg-sky-500'
            : 'bg-zinc-400';
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone}`} />;
}
