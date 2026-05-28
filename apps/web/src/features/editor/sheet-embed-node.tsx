/**
 * `sheetEmbed` — a block-level TipTap node pointing at a `sheet`
 * Block.
 *
 * Renders a full AG Grid + HyperFormula instance via a ReactNodeView.
 * The grid owns its own state and saves to the DB on edits; the
 * Yjs-backed editor doc only carries the sheet id.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { sheetPropsSchema, type SheetCells, type SheetProps } from '@synapse/blocks';

import { trpc } from '../../lib/trpc.js';
import { SheetGrid } from '../sheet/sheet-grid.js';

declare module '@tiptap/core' {
  // CLAUDE.md §4: `interface` permitted for declaration merging — this
  // is exactly TipTap's Commands augmentation pattern.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    sheetEmbed: {
      insertSheetEmbed: (sheetId: string) => ReturnType;
    };
  }
}

export const SheetEmbedNode = Node.create({
  name: 'sheetEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      sheetId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-sheet-id') ?? '',
        renderHTML: (attrs) => ({ 'data-sheet-id': attrs['sheetId'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-sheet-embed]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-sheet-embed': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SheetEmbedView);
  },

  addCommands() {
    return {
      insertSheetEmbed:
        (sheetId: string) =>
        ({ commands }) => {
          // Block-level atomic insert: a single `insertContent` does the
          // right thing. The chained-paragraph pattern from inline
          // helpers (see pbiRef) drops the block on the floor here.
          return commands.insertContent({
            type: this.name,
            attrs: { sheetId },
          });
        },
    };
  },
});

const SAVE_DEBOUNCE_MS = 800;

function SheetEmbedView({ node }: ReactNodeViewProps) {
  const sheetId = String(node.attrs['sheetId'] ?? '');
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['block', 'getSheet', sheetId],
    queryFn: () => trpc.block.getSheet.query({ sheetId }),
    enabled: !!sheetId,
  });

  const [cells, setCells] = useState<SheetCells>({});
  const seededRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Prompt → resolved text. `null` while in flight; once resolved we keep
  // the answer indefinitely (same prompt → same answer for the session).
  const [askAnswers, setAskAnswers] = useState<Record<string, string | null>>({});

  const props: SheetProps | null = query.data
    ? sheetPropsSchema.parse(query.data.props ?? {})
    : null;
  const workspaceId = query.data?.workspaceId ?? '';

  useEffect(() => {
    if (!seededRef.current && props) {
      setCells(props.cells);
      seededRef.current = true;
    }
  }, [props]);

  const save = useMutation({
    mutationFn: (next: SheetCells) => trpc.block.updateSheetCells.mutate({ sheetId, cells: next }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['block', 'getSheet', sheetId] });
    },
  });

  const askMut = useMutation({
    mutationFn: (prompt: string) => trpc.ai.ask.mutate({ workspaceId, prompt }),
  });

  const handleCellsChange = useCallback(
    (next: SheetCells) => {
      setCells(next);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        save.mutate(next);
        timerRef.current = null;
      }, SAVE_DEBOUNCE_MS);
    },
    [save],
  );

  const resolveAsk = useCallback((prompt: string) => askAnswers[prompt] ?? null, [askAnswers]);

  const handleAskPrompt = useCallback(
    (prompt: string) => {
      if (!workspaceId) return;
      // Skip if already resolved or in flight.
      if (prompt in askAnswers) return;
      setAskAnswers((m) => ({ ...m, [prompt]: null }));
      askMut.mutate(prompt, {
        onSuccess: (res) => {
          setAskAnswers((m) => ({ ...m, [prompt]: res.text }));
        },
        onError: () => {
          setAskAnswers((m) => ({ ...m, [prompt]: '#ASK!' }));
        },
      });
    },
    [askAnswers, askMut, workspaceId],
  );

  if (!sheetId) {
    return (
      <NodeViewWrapper as="div" className="not-prose my-4">
        <p className="text-sm text-zinc-500">(missing sheet reference)</p>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      data-testid={`sheet-embed-${sheetId}`}
      data-sheet-id={sheetId}
      className="not-prose my-4 rounded-md border border-zinc-200 dark:border-zinc-800"
      contentEditable={false}
    >
      {query.isPending || !props ? (
        <p className="p-4 text-sm text-zinc-500">Loading sheet…</p>
      ) : (
        <SheetGrid
          rows={props.rows}
          cols={props.cols}
          cells={cells}
          onCellsChange={handleCellsChange}
          resolveAsk={resolveAsk}
          onAskPromptSeen={handleAskPrompt}
        />
      )}
      <footer className="flex items-center justify-between px-3 py-2 text-xs text-zinc-500">
        <span className="font-mono">sheet · {sheetId.slice(-6)}</span>
        <span data-testid={`sheet-status-${sheetId}`}>
          {save.isPending ? 'saving…' : save.isSuccess ? 'saved' : 'idle'}
        </span>
      </footer>
    </NodeViewWrapper>
  );
}
