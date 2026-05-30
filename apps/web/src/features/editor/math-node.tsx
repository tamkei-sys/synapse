/**
 * 数式ノード (PBI-38) — KaTeX 描画。
 *
 *   - inlineMath: 文中の `$...$` 相当（inline atom）
 *   - mathBlock:  display 数式（block atom）
 *
 * どちらも attr `latex` を持ち、NodeView で katex.renderToString して
 * 表示。クリックで textarea を出し、その場で LaTeX を編集できる。
 * 不正な LaTeX は KaTeX の throwOnError=false でエラー表示にフォールバック。
 *
 * Collaboration: attr は LaTeX 文字列のみ。描画は各クライアント。
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import katex from 'katex';
import { useMemo, useState } from 'react';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    math: {
      insertInlineMath: (latex?: string) => ReturnType;
      insertMathBlock: (latex?: string) => ReturnType;
    };
  }
}

function renderKatex(latex: string, displayMode: boolean): { html: string; error: boolean } {
  try {
    const html = katex.renderToString(latex || '\\,', {
      displayMode,
      throwOnError: false,
      output: 'html',
    });
    return { html, error: false };
  } catch {
    return { html: '', error: true };
  }
}

const latexAttr = {
  latex: {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute('data-latex') ?? '',
    renderHTML: (attrs: Record<string, unknown>) => ({ 'data-latex': String(attrs['latex'] ?? '') }),
  },
};

export const InlineMathNode = Node.create({
  name: 'inlineMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return latexAttr;
  },
  parseHTML() {
    return [{ tag: 'span[data-inline-math]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-inline-math': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: ReactNodeViewProps) => (
      <MathView {...props} displayMode={false} />
    ));
  },
  addCommands() {
    return {
      insertInlineMath:
        (latex = '') =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { latex } })
            .insertContent(' ')
            .run(),
    };
  },
});

export const MathBlockNode = Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  selectable: true,
  addAttributes() {
    return latexAttr;
  },
  parseHTML() {
    return [{ tag: 'div[data-math-block]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-math-block': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer((props: ReactNodeViewProps) => (
      <MathView {...props} displayMode={true} />
    ));
  },
  addCommands() {
    return {
      insertMathBlock:
        (latex = '') =>
        ({ chain }) =>
          chain().insertContent({ type: this.name, attrs: { latex } }).run(),
    };
  },
});

function MathView({
  node,
  updateAttributes,
  displayMode,
}: ReactNodeViewProps & { displayMode: boolean }) {
  const latex = String(node.attrs['latex'] ?? '');
  const [editing, setEditing] = useState(latex === '');
  const rendered = useMemo(() => renderKatex(latex, displayMode), [latex, displayMode]);

  if (editing) {
    return (
      <NodeViewWrapper
        as={displayMode ? 'div' : 'span'}
        data-testid="math-edit"
        className={displayMode ? 'not-prose my-2' : 'not-prose inline-block align-baseline'}
        contentEditable={false}
      >
        <textarea
          defaultValue={latex}
          autoFocus
          rows={displayMode ? 2 : 1}
          placeholder="LaTeX（例: \\frac{a}{b}）"
          data-testid="math-input"
          onBlur={(e) => {
            updateAttributes({ latex: e.currentTarget.value });
            setEditing(false);
          }}
          className="w-full min-w-48 rounded border border-zinc-300 bg-white px-2 py-1 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      as={displayMode ? 'div' : 'span'}
      data-testid="math-view"
      data-latex={latex}
      onClick={() => setEditing(true)}
      className={
        displayMode
          ? 'not-prose my-2 cursor-pointer overflow-x-auto text-center'
          : 'not-prose inline-block cursor-pointer align-baseline'
      }
      contentEditable={false}
    >
      {rendered.error ? (
        <span className="text-sm text-red-500">数式エラー</span>
      ) : (
        // KaTeX が生成した HTML を埋め込む。入力は LaTeX のみで、KaTeX が
        // エスケープ済み HTML を返すため XSS 面は KaTeX の保証に依存する。
        <span dangerouslySetInnerHTML={{ __html: rendered.html }} />
      )}
    </NodeViewWrapper>
  );
}
