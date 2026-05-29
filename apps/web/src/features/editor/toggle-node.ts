/**
 * `toggle` — Notion 風の折りたたみブロック (PBI-36)。
 *
 * 構造: toggle > (toggleSummary, toggleDetails)
 *   - toggleSummary: 見出し行 (常に表示)。inline content。
 *   - toggleDetails: 折りたたまれる本文。block+。
 *
 * 開閉状態は `open` 属性で持つ。Yjs 越しでも同期される（複数人で同じ
 * トグルを開閉できる）。NodeView を使わず、CSS の data-open で details を
 * 出し分けする — シンプルで Collaboration とも相性が良い。
 *
 * ネイティブ <details>/<summary> を使わない理由: ProseMirror が
 * <summary> 内の選択を扱いづらいため、div 構造 + CSS で代替する。
 */
import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
      toggleToggleOpen: () => ReturnType;
    };
  }
}

export const ToggleSummary = Node.create({
  name: 'toggleSummary',
  content: 'inline*',
  defining: true,
  selectable: false,
  parseHTML() {
    return [{ tag: 'div[data-toggle-summary]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-toggle-summary': '', class: 'font-medium' }),
      0,
    ];
  },
});

export const ToggleDetails = Node.create({
  name: 'toggleDetails',
  content: 'block+',
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-toggle-details]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-toggle-details': '',
        class: 'ml-5 border-l border-zinc-200 pl-3 dark:border-zinc-700',
      }),
      0,
    ];
  },
});

export const ToggleNode = Node.create({
  name: 'toggle',
  group: 'block',
  content: 'toggleSummary toggleDetails',
  defining: true,

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute('data-open') !== 'false',
        renderHTML: (attrs) => ({ 'data-open': attrs['open'] ? 'true' : 'false' }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-toggle]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-toggle': '', class: 'not-prose my-2' }),
      0,
    ];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ chain }) =>
          chain()
            .insertContent({
              type: this.name,
              attrs: { open: true },
              content: [
                { type: 'toggleSummary', content: [{ type: 'text', text: 'トグル見出し' }] },
                { type: 'toggleDetails', content: [{ type: 'paragraph' }] },
              ],
            })
            .run(),
      toggleToggleOpen:
        () =>
        ({ editor, commands }) => {
          const open = editor.getAttributes(this.name)['open'] !== false;
          return commands.updateAttributes(this.name, { open: !open });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + Enter でトグルの開閉
      'Mod-Enter': () => this.editor.commands.toggleToggleOpen(),
    };
  },
});
