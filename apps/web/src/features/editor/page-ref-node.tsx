/**
 * `pageRef` — TipTap の inline node。Notion の「子ページ」リンクと同じ立ち位置 (PBI-34)。
 *
 * 設計判断:
 *   - atom + inline。コンテンツは持たず、`pageId` だけ保持する。
 *   - タイトルは作成時に attrs に入れておく（即時表示用）。再 fetch でも
 *     最新タイトルにフレッシュ化する（ページ名を変えたら反映される）。
 *   - ノードクリック → `/p/$pageId` へ遷移。テキストは contenteditable=false で
 *     カーソルが入らないようにする。
 *   - ノード横の小さな ✏ で「親ページに戻る」表示はしない（Sidebar とパンくず
 *     で十分。エディタ内をミニ UI で詰めない）。
 */
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

import { trpc } from '../../lib/trpc.js';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    pageRef: {
      insertPageRef: (pageId: string, title: string) => ReturnType;
    };
  }
}

export const PageRefNode = Node.create({
  name: 'pageRef',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      pageId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-page-id') ?? '',
        renderHTML: (attrs) => ({ 'data-page-id': attrs['pageId'] }),
      },
      title: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-title') ?? '',
        renderHTML: (attrs) => ({ 'data-title': attrs['title'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-page-ref]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-page-ref': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageRefView);
  },

  addCommands() {
    return {
      insertPageRef:
        (pageId, title) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { pageId, title } })
            .insertContent(' ')
            .run(),
    };
  },
});

function PageRefView({ node }: ReactNodeViewProps) {
  const pageId = String(node.attrs['pageId'] ?? '');
  const fallbackTitle = String(node.attrs['title'] ?? '無題');
  const navigate = useNavigate();

  // 最新タイトルが欲しいので block.getPage を見る。pending 中は attrs に
  // 入っているタイトルをそのまま使うので「無題」になることはない。
  const q = useQuery({
    queryKey: ['block', 'getPage', pageId],
    queryFn: () => trpc.block.getPage.query({ pageId }),
    enabled: !!pageId,
    staleTime: 30_000,
  });
  const liveTitle =
    (q.data?.page.props as { title?: string } | null | undefined)?.title ?? fallbackTitle;

  return (
    <NodeViewWrapper
      as="span"
      data-testid={`page-ref-${pageId}`}
      data-page-id={pageId}
      className="not-prose inline-flex select-none items-center gap-1 rounded-md border border-zinc-200 bg-violet-50 px-1.5 py-0.5 align-baseline text-sm text-violet-900 hover:bg-violet-100 dark:border-zinc-700 dark:bg-violet-900/30 dark:text-violet-100 dark:hover:bg-violet-900/50"
      contentEditable={false}
    >
      <button
        type="button"
        onClick={() => navigate({ to: '/p/$pageId', params: { pageId } })}
        data-testid={`page-ref-link-${pageId}`}
        className="flex items-center gap-1 font-medium"
      >
        <span aria-hidden>📄</span>
        <span>{liveTitle}</span>
      </button>
    </NodeViewWrapper>
  );
}
