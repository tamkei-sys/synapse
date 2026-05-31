/**
 * `dbEmbed` — user-defined DB をドキュメント本文に埋め込むブロックノード。
 *
 * sheetEmbed と同型: ReactNodeView で DbView（テーブル/ボード/フォーム等）を本文内に
 * 描画する。Yjs-backed の editor doc には DB の id だけを載せ、DB の状態は DB 側の
 * tRPC（db.get / addRow / updateCell …）が真実として持つ。
 *
 * 公開ページ (sanitizePublicDoc) の ALLOWED_NODES には含めない → read-only 共有では
 * 社内データとして自動的に除外される（sheetEmbed と同じ扱い）。
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

import { DbView } from '../db/db-view.js';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    dbEmbed: {
      insertDbEmbed: (dbId: string) => ReturnType;
    };
  }
}

export const DbEmbedNode = Node.create({
  name: 'dbEmbed',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      dbId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-db-id') ?? '',
        renderHTML: (attrs) => ({ 'data-db-id': attrs['dbId'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-db-embed]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-db-embed': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DbEmbedView);
  },

  addCommands() {
    return {
      insertDbEmbed:
        (dbId: string) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { dbId } }),
    };
  },
});

function DbEmbedView({ node }: ReactNodeViewProps) {
  const dbId = String(node.attrs['dbId'] ?? '');
  if (!dbId) {
    return (
      <NodeViewWrapper as="div" className="not-prose my-4">
        <p className="text-sm text-zinc-500">(missing database reference)</p>
      </NodeViewWrapper>
    );
  }
  return (
    <NodeViewWrapper
      as="div"
      data-testid={`db-embed-${dbId}`}
      data-db-id={dbId}
      className="not-prose my-4 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
      contentEditable={false}
    >
      <DbView dbId={dbId} />
    </NodeViewWrapper>
  );
}
