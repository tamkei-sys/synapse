/**
 * Mermaid 図ノード (PBI-116) — ```mermaid 記法のダイアグラム描画。
 *
 * atom block ノードで attr `code`（mermaid ソース）を持つ。NodeView が
 * renderMermaid で SVG を生成して表示し、クリックで textarea を開いてその場で
 * 編集できる。構文エラーは赤字メッセージにフォールバックし、ソースは保持する。
 * 描画ライブラリは遅延ロード（mermaid-render.ts）。
 *
 * Collaboration: attr は code 文字列のみ。SVG は各クライアントが描画する
 * （mathBlock の latex と同型）。公開ページ (read-only) では編集 UI を出さず
 * SVG だけ表示する。
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useEffect, useState } from 'react';

import { renderMermaid } from './mermaid-render.js';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    mermaid: {
      insertMermaidBlock: (code?: string) => ReturnType;
    };
  }
}

/** /mermaid で挿入するスターター図（即描画されて手応えが出る）。 */
export const MERMAID_STARTER = 'flowchart TD\n  A[開始] --> B[完了]';

const codeAttr = {
  code: {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute('data-code') ?? '',
    renderHTML: (attrs: Record<string, unknown>) => ({ 'data-code': String(attrs['code'] ?? '') }),
  },
};

export const MermaidBlockNode = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return codeAttr;
  },
  parseHTML() {
    return [{ tag: 'div[data-mermaid]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-mermaid': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },
  addCommands() {
    return {
      insertMermaidBlock:
        (code = MERMAID_STARTER) =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { code } }).run(),
    };
  },
});

function MermaidView({ node, updateAttributes, editor }: ReactNodeViewProps) {
  const code = String(node.attrs['code'] ?? '');
  const editable = editor.isEditable;
  const [editing, setEditing] = useState(editable && code === '');
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) return;
    let alive = true;
    setLoading(true);
    const dark = document.documentElement.classList.contains('dark');
    void renderMermaid(code, dark).then((res) => {
      if (!alive) return;
      setLoading(false);
      if (res.ok) {
        setSvg(res.svg);
        setError('');
      } else {
        setError(res.error);
        setSvg('');
      }
    });
    return () => {
      alive = false;
    };
  }, [code, editing]);

  if (editing) {
    return (
      <NodeViewWrapper as="div" data-testid="mermaid-edit" className="not-prose my-2" contentEditable={false}>
        <textarea
          defaultValue={code}
          autoFocus
          rows={Math.max(3, code.split('\n').length + 1)}
          placeholder="Mermaid 記法（例: flowchart TD / A --> B）"
          data-testid="mermaid-input"
          onBlur={(e) => {
            updateAttributes({ code: e.currentTarget.value });
            setEditing(false);
          }}
          className="w-full rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
        <p className="mt-1 text-xs text-zinc-400">フォーカスを外すと描画します。</p>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as="div"
      data-testid="mermaid-view"
      onClick={editable ? () => setEditing(true) : undefined}
      className={`not-prose my-2 overflow-x-auto text-center ${editable ? 'cursor-pointer' : ''}`}
      contentEditable={false}
    >
      {loading ? (
        <span className="text-sm text-zinc-400">図を描画中…</span>
      ) : error ? (
        <span data-testid="mermaid-error" className="text-sm text-red-500">
          Mermaid 構文エラー: {error}
        </span>
      ) : (
        // renderMermaid は securityLevel:'strict' で SVG を生成しており、
        // <script> 除去・HTML ラベル無効。XSS 面は mermaid の保証に依存する。
        <span data-testid="mermaid-svg" dangerouslySetInnerHTML={{ __html: svg }} />
      )}
    </NodeViewWrapper>
  );
}
