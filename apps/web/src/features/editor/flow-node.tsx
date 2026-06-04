/**
 * `flowBlock` — a block-level TipTap node embedding an interactive flow graph
 * (apps/web/src/features/flow). The whole `FlowDoc` lives JSON-encoded in the
 * `doc` attribute and rides the page's Yjs document — the self-contained
 * pattern from `mermaidBlock`, so there's no separate DB block or save call.
 *
 * The NodeView renders the canvas read-only-to-edit; until the visual authoring
 * UI lands (PBI-136), an editable doc offers a raw-JSON editor as a stopgap so
 * the block can still be authored end-to-end. Invalid JSON falls back to an
 * inline error and preserves the source.
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useMemo, useState } from 'react';

import { safeParseFlowDoc, type FlowDoc } from '@synapse/blocks';

import { FlowCanvas } from '../flow/flow-canvas.js';
import { FLOW_STARTER_JSON } from '../flow/sample-flow.js';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    flowBlock: {
      insertFlowBlock: (doc?: string) => ReturnType;
    };
  }
}

const docAttr = {
  doc: {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute('data-doc') ?? '',
    renderHTML: (attrs: Record<string, unknown>) => ({ 'data-doc': String(attrs['doc'] ?? '') }),
  },
};

export const FlowBlockNode = Node.create({
  name: 'flowBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return docAttr;
  },
  parseHTML() {
    return [{ tag: 'div[data-flow-block]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-flow-block': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FlowView);
  },
  addCommands() {
    return {
      insertFlowBlock:
        (doc = FLOW_STARTER_JSON) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { doc } }),
    };
  },
});

type Parsed = { ok: true; doc: FlowDoc } | { ok: false; error: string };

function parseDocAttr(raw: string): Parsed {
  if (!raw.trim()) return { ok: false, error: 'フローが空です' };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'JSON として解釈できません' };
  }
  const r = safeParseFlowDoc(json);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? '不正なフロー定義' };
  return { ok: true, doc: r.data };
}

function FlowView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const raw = String(node.attrs['doc'] ?? '');
  const editable = editor.isEditable;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState('');

  const parsed = useMemo(() => parseDocAttr(raw), [raw]);

  const openEditor = (): void => {
    let pretty = raw;
    try {
      pretty = JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      /* keep raw as-is if it doesn't parse */
    }
    setDraft(pretty);
    setEditError('');
    setEditing(true);
  };

  const saveEditor = (): void => {
    let json: unknown;
    try {
      json = JSON.parse(draft);
    } catch {
      setEditError('JSON 構文エラー');
      return;
    }
    const r = safeParseFlowDoc(json);
    if (!r.success) {
      setEditError(r.error.issues[0]?.message ?? '不正なフロー定義');
      return;
    }
    updateAttributes({ doc: JSON.stringify(r.data) });
    setEditing(false);
  };

  if (editing) {
    return (
      <NodeViewWrapper as="div" className="not-prose my-3" data-testid="flow-edit" contentEditable={false}>
        <div className="rounded-lg border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
          <p className="mb-2 text-xs text-zinc-500">
            フロー定義（JSON）。ノード・エッジ・カテゴリ・ステップを編集できます。
          </p>
          <textarea
            value={draft}
            autoFocus
            spellCheck={false}
            onChange={(e) => setDraft(e.currentTarget.value)}
            rows={Math.min(24, Math.max(8, draft.split('\n').length + 1))}
            className="w-full rounded border border-zinc-300 bg-zinc-50 px-2 py-1.5 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          {editError ? <p className="mt-1 text-xs text-red-500">{editError}</p> : null}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={saveEditor}
              className="rounded bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-500"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded px-3 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              キャンセル
            </button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="div" className="not-prose my-3" data-testid="flow-block" contentEditable={false}>
      {parsed.ok ? (
        <FlowCanvas doc={parsed.doc} />
      ) : (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400">
          フローを表示できません: {parsed.error}
        </div>
      )}
      {editable ? (
        <div className="mt-1 flex justify-end">
          <button
            type="button"
            onClick={openEditor}
            data-testid="flow-edit-json"
            className="rounded px-2 py-0.5 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            JSON を編集
          </button>
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}
