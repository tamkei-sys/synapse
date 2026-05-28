/**
 * TipTap extension that wires the slash menu to ProseMirror's
 * Suggestion plugin and renders the React popup via tippy.js.
 *
 * Mounts onto any node — paragraphs, headings, list items. Pressing `/`
 * opens the menu; Esc / clicking away / committing a selection closes it.
 */
import { Extension, type Range } from '@tiptap/core';
import { ReactRenderer, type Editor } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy, { type Instance as TippyInstance } from 'tippy.js';
import 'tippy.js/dist/tippy.css';

import { SlashMenu, type SlashCommand, type SlashMenuRef, filterCommands } from './slash-menu.js';

type RenderProps = {
  editor: Editor;
  range: Range;
  query: string;
  command: (item: SlashCommand) => void;
  items: SlashCommand[];
  clientRect?: (() => DOMRect | null) | null;
};

type MenuProps = {
  items: SlashCommand[];
  command: (item: SlashCommand) => void;
};

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: SlashCommand;
        }) => {
          props.run(editor, range);
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => filterCommands(query),
        render: () => {
          let component: ReactRenderer<SlashMenuRef, MenuProps> | null = null;
          let popup: TippyInstance | null = null;

          return {
            onStart: (props: RenderProps) => {
              component = new ReactRenderer(SlashMenu, {
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
              const ref = component?.ref;
              if (!ref) return false;
              return ref.onKeyDown(props.event);
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
