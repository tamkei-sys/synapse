/**
 * `columnList` / `column` — 横並びの段組レイアウト (PBI-45)。
 *
 * 構造: columnList > column{2,}（各 column は block+）
 *   - columnList: 段組のコンテナ。flex 横並び（モバイルは縦積み）。
 *   - column: 1 列。中に通常ブロック（段落・見出し・リスト等）を入れられる。
 *
 * Collaboration 互換: NodeView を使わず renderHTML の content hole (0) で
 * 子ブロックを描く。属性は持たない（純粋な構造ノード）。column は isolating で
 * カーソル移動・削除がカラム境界を越えないようにする。
 */
import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    columnList: {
      /** count 列（既定 2、最小 2）の段組を挿入する。 */
      setColumns: (count?: number) => ReturnType;
    };
  }
}

export const ColumnNode = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true,
  selectable: false,
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-column]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-column': '', class: 'min-w-0 flex-1' }),
      0,
    ];
  },
});

export const ColumnListNode = Node.create({
  name: 'columnList',
  group: 'block',
  content: 'column{2,}',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-column-list]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-column-list': '',
        class: 'not-prose my-3 flex flex-col gap-3 sm:flex-row sm:gap-4',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setColumns:
        (count = 2) =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              content: Array.from({ length: Math.max(2, count) }, () => ({
                type: 'column',
                content: [{ type: 'paragraph' }],
              })),
            })
            .run(),
    };
  },
});
