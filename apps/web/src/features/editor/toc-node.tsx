/**
 * `tocBlock` — 目次（自動生成）ブロック (PBI-47)。
 *
 * ドキュメント内の heading を NodeView で live スキャンして箇条書きにする。
 * 見出しを編集すると ProseMirror の再描画に乗って TOC も更新される。
 *
 * クリックで該当見出しまでスクロール。見出しに id は振られていないので、
 * テキスト一致で DOM を探して scrollIntoView する（シンプルな実装）。
 *
 * atom node（中身を持たない）。Collaboration では「ここに TOC を置く」と
 * いう印だけ同期され、中身は各クライアントがローカルに描画する。
 */
import { Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import { useEditorState } from '@tiptap/react';
import { type ReactNodeViewProps } from '@tiptap/react';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    tocBlock: {
      setTocBlock: () => ReturnType;
    };
  }
}

export const TocNode = Node.create({
  name: 'tocBlock',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'div[data-toc]' }];
  },

  renderHTML() {
    return ['div', { 'data-toc': '' }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(TocView);
  },

  addCommands() {
    return {
      setTocBlock:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).run(),
    };
  },
});

type Heading = { level: number; text: string };

function TocView(props: ReactNodeViewProps) {
  const editor = props.editor;
  // 見出しが変わるたびに再計算。useEditorState で doc を購読する。
  const headings = useEditorState({
    editor,
    selector: ({ editor: e }): Heading[] => {
      const out: Heading[] = [];
      e.state.doc.descendants((node) => {
        if (node.type.name === 'heading') {
          out.push({
            level: Number(node.attrs['level'] ?? 1),
            text: node.textContent,
          });
        }
        return true;
      });
      return out;
    },
  });

  const jump = (text: string) => {
    const root = editor.view.dom;
    const candidates = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    for (const el of Array.from(candidates)) {
      if (el.textContent === text) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      data-testid="toc-block"
      contentEditable={false}
      className="not-prose my-3 rounded-md border border-zinc-200 bg-zinc-50/60 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/30"
    >
      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">目次</p>
      {headings.length === 0 ? (
        <p className="text-xs text-zinc-400">見出しがありません</p>
      ) : (
        <ul className="space-y-0.5">
          {headings.map((h, i) => (
            <li key={`${i}-${h.text}`} style={{ paddingLeft: (h.level - 1) * 12 }}>
              <button
                type="button"
                onClick={() => jump(h.text)}
                data-testid={`toc-item-${i}`}
                className="text-left text-zinc-600 hover:text-violet-600 hover:underline dark:text-zinc-300 dark:hover:text-violet-300"
              >
                {h.text || '(無題の見出し)'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </NodeViewWrapper>
  );
}
