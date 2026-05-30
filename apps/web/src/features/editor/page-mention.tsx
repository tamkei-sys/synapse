/**
 * `@page` インライン参照 autocomplete (PBI-69)。
 *
 * `@` を打つとサジェストが開き、block.searchPages でタイトル部分一致の
 * ページ候補を出す。選択すると pageRef ノードを挿入する（D2 のノードを再利用）。
 *
 * 実装は slash-extension と同じく @tiptap/suggestion + tippy + ReactRenderer。
 * items が tRPC を叩く非同期である点だけが違う。
 */
import { Extension, type Range } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer, type Editor } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import { trpc } from '../../lib/trpc.js';

type PageItem = { id: string; title: string; icon: string | null };

type MentionOptions = {
  workspaceId: string;
};

type MenuRef = { onKeyDown: (e: KeyboardEvent) => boolean };
type MenuProps = { items: PageItem[]; command: (item: PageItem) => void };

const PageMentionMenu = forwardRef<MenuRef, MenuProps>(function PageMentionMenu(
  { items, command },
  ref,
) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [items]);
  useImperativeHandle(ref, () => ({
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        setIndex((i) => (i + items.length - 1) % Math.max(1, items.length));
        return true;
      }
      if (e.key === 'ArrowDown') {
        setIndex((i) => (i + 1) % Math.max(1, items.length));
        return true;
      }
      if (e.key === 'Enter') {
        const item = items[index];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-500 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
        ページが見つかりません
      </div>
    );
  }

  return (
    <div
      data-testid="page-mention-menu"
      className="max-h-64 w-64 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          onClick={() => command(item)}
          data-testid={`page-mention-item-${item.id}`}
          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left ${
            i === index
              ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="w-4 text-center text-xs">{item.icon || '📄'}</span>
          <span className="min-w-0 truncate">{item.title}</span>
        </button>
      ))}
    </div>
  );
});

type RenderProps = {
  editor: Editor;
  range: Range;
  command: (item: PageItem) => void;
  items: PageItem[];
  clientRect?: (() => DOMRect | null) | null;
};

export const PageMentionExtension = Extension.create<MentionOptions>({
  name: 'pageMention',

  addOptions() {
    return { workspaceId: '' };
  },

  addProseMirrorPlugins() {
    const workspaceId = this.options.workspaceId;
    return [
      Suggestion<PageItem>({
        editor: this.editor,
        // slash の suggestion と plugin key が衝突しないよう専用キーを付ける。
        pluginKey: new PluginKey('synapse-page-mention'),
        char: '@',
        allowSpaces: false,
        startOfLine: false,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertPageRef(props.id, props.title)
            .run();
        },
        items: async ({ query }) => {
          if (!workspaceId) return [];
          try {
            return await trpc.block.searchPages.query({ workspaceId, query });
          } catch {
            return [];
          }
        },
        render: () => {
          let component: ReactRenderer<MenuRef, MenuProps> | null = null;
          let popup: TippyInstance | null = null;
          return {
            onStart: (props: RenderProps) => {
              component = new ReactRenderer(PageMentionMenu, {
                editor: props.editor,
                props: { items: props.items, command: props.command },
              });
              if (!props.clientRect) return;
              const [instance] = tippy('body', {
                getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
              });
              popup = instance ?? null;
            },
            onUpdate(props: RenderProps) {
              component?.updateProps({ items: props.items, command: props.command });
              if (props.clientRect) {
                popup?.setProps({
                  getReferenceClientRect: () => props.clientRect?.() ?? new DOMRect(),
                });
              }
            },
            onKeyDown(props: { event: KeyboardEvent }) {
              if (props.event.key === 'Escape') {
                popup?.hide();
                return true;
              }
              return component?.ref?.onKeyDown(props.event) ?? false;
            },
            onExit() {
              popup?.destroy();
              component?.destroy();
              component = null;
              popup = null;
            },
          };
        },
      }),
    ];
  },
});
