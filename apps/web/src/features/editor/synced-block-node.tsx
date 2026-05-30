/**
 * `syncedBlock` — 別ページの本文を read-only でライブ表示する同期ブロック (PBI-48)。
 *
 * source ページの `props.doc` スナップショットを PublicPageEditor で描画し、
 * polling (5s) で source の編集を準ライブに反映する（source の version が変われば
 * key で再マウント）。双方向の即時編集は将来 — まずは「一箇所を直すと参照先に
 * 反映される」核心価値を read-only で満たす。
 *
 * Yjs 互換: 持つ属性は source の blockId 文字列のみ。本文は source 側の Yjs doc
 * が真実なので、この doc には載せない（sheetEmbed と同じ思想）。社内データなので
 * 公開ページ (sanitizePublicDoc) では許可せず、read-only 共有には出さない。
 */
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';

import { trpc } from '../../lib/trpc.js';
import { PublicPageEditor } from './public-page-editor.js';

export type SyncedBlockOptions = { workspaceId: string };

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    syncedBlock: {
      /** 同期ブロックを挿入する（sourceId 未指定なら NodeView 内でページ選択）。 */
      insertSyncedBlock: (sourceId?: string) => ReturnType;
    };
  }
}

export const SyncedBlockNode = Node.create<SyncedBlockOptions>({
  name: 'syncedBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { workspaceId: '' };
  },

  addAttributes() {
    return {
      sourceId: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-source-id') ?? '',
        renderHTML: (attrs) => ({ 'data-source-id': String(attrs['sourceId'] ?? '') }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-synced-block]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-synced-block': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SyncedBlockView);
  },

  addCommands() {
    return {
      insertSyncedBlock:
        (sourceId = '') =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { sourceId } }),
    };
  },
});

function SyncedBlockView({ node, updateAttributes, extension }: ReactNodeViewProps) {
  const sourceId = String(node.attrs['sourceId'] ?? '');
  const workspaceId = (extension.options as SyncedBlockOptions).workspaceId;
  return (
    <NodeViewWrapper
      as="div"
      data-testid="synced-block"
      data-source-id={sourceId}
      className="not-prose my-3 rounded-md border border-zinc-200 dark:border-zinc-700"
      contentEditable={false}
    >
      {sourceId ? (
        <SyncedBlockContent sourceId={sourceId} onClear={() => updateAttributes({ sourceId: '' })} />
      ) : (
        <SyncedBlockPicker workspaceId={workspaceId} onPick={(id) => updateAttributes({ sourceId: id })} />
      )}
    </NodeViewWrapper>
  );
}

function SyncedBlockPicker({
  workspaceId,
  onPick,
}: {
  workspaceId: string;
  onPick: (id: string) => void;
}) {
  const pages = useQuery({
    queryKey: ['block', 'listAllPages', workspaceId],
    queryFn: () => trpc.block.listAllPages.query({ workspaceId }),
    enabled: !!workspaceId,
  });
  return (
    <div className="p-3">
      <p className="mb-2 text-sm text-zinc-500">🔄 同期する元ページを選択</p>
      <select
        data-testid="synced-block-picker"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onPick(e.target.value);
        }}
        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="" disabled>
          ページを選択…
        </option>
        {pages.data?.map((p) => {
          const title = (p.props as { title?: string } | null | undefined)?.title ?? '無題';
          return (
            <option key={p.id} value={p.id}>
              {title}
            </option>
          );
        })}
      </select>
    </div>
  );
}

function SyncedBlockContent({ sourceId, onClear }: { sourceId: string; onClear: () => void }) {
  const page = useQuery({
    queryKey: ['block', 'getPage', sourceId],
    queryFn: () => trpc.block.getPage.query({ pageId: sourceId }),
    refetchInterval: 5_000,
  });

  if (page.isPending) {
    return <p className="p-3 text-sm text-zinc-500">同期元を読み込み中…</p>;
  }
  if (page.error || !page.data) {
    return (
      <div className="flex items-center justify-between p-3 text-sm text-zinc-500">
        <span>同期元のページが見つかりません。</span>
        <button type="button" onClick={onClear} data-testid="synced-block-clear" className="text-xs hover:text-red-600">
          解除
        </button>
      </div>
    );
  }

  const data = page.data.page;
  const props = (data.props ?? {}) as { title?: string; icon?: string; doc?: unknown };
  return (
    <div>
      <header className="flex items-center justify-between border-b border-zinc-100 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-800">
        <span className="flex items-center gap-1">
          <span aria-hidden>🔄</span>
          <span>同期中:</span>
          <Link
            to="/p/$pageId"
            params={{ pageId: sourceId }}
            data-testid="synced-block-source-link"
            className="font-medium text-violet-600 hover:underline dark:text-violet-300"
          >
            {props.icon || '📄'} {props.title ?? '無題'}
          </Link>
        </span>
        <button type="button" onClick={onClear} data-testid="synced-block-clear" className="hover:text-red-600">
          解除
        </button>
      </header>
      <div className="px-3 py-2">
        <PublicPageEditor key={`${sourceId}:${data.version}`} doc={props.doc ?? { type: 'doc', content: [] }} />
      </div>
    </div>
  );
}
