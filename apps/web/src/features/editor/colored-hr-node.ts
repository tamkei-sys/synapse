/**
 * `horizontalRule` — 色を変えられる区切り線 (PBI-49)。
 *
 * StarterKit の horizontalRule を無効化して差し替える自前ノード。新しい依存
 * (@tiptap/extension-horizontal-rule) を足さず、@tiptap/core の Node.create だけで
 * 組む。color 属性を持ち、ホバーで出る小さな色スウォッチをクリックすると
 * updateAttributes で Yjs に色が乗る（複数人で同じ線の色が同期される）。
 *
 * NodeView は素の DOM（React 不使用）で軽量。属性は color 文字列のみで
 * Collaboration 互換。
 */
import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core';

export const HR_COLORS = ['default', 'red', 'amber', 'green', 'blue', 'violet'] as const;

/** 線色クラス。未知の色は default にフォールバック。 */
function hrLineClass(color: string): string {
  const map: Record<string, string> = {
    red: 'border-red-400',
    amber: 'border-amber-400',
    green: 'border-green-400',
    blue: 'border-blue-400',
    violet: 'border-violet-400',
  };
  return map[color] ?? 'border-zinc-300 dark:border-zinc-600';
}

/** スウォッチ（丸ボタン）の塗り色。 */
function hrSwatchClass(color: string): string {
  const map: Record<string, string> = {
    red: 'bg-red-400',
    amber: 'bg-amber-400',
    green: 'bg-green-400',
    blue: 'bg-blue-400',
    violet: 'bg-violet-400',
  };
  return map[color] ?? 'bg-zinc-400';
}

export const ColoredHorizontalRule = Node.create({
  name: 'horizontalRule',
  group: 'block',

  addAttributes() {
    return {
      color: {
        default: 'default',
        parseHTML: (el) => el.getAttribute('data-color') ?? 'default',
        renderHTML: (attrs) => ({ 'data-color': String(attrs['color'] ?? 'default') }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'hr' }];
  },

  renderHTML({ HTMLAttributes }) {
    const color = String(HTMLAttributes['data-color'] ?? 'default');
    return [
      'hr',
      mergeAttributes(HTMLAttributes, { class: `my-4 border-t-2 ${hrLineClass(color)}` }),
    ];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const wrap = document.createElement('div');
      wrap.className = 'group/hr relative my-4';
      wrap.setAttribute('data-hr-wrap', '');

      const hr = document.createElement('hr');
      const paint = (c: string) => {
        hr.className = `border-t-2 ${hrLineClass(c)}`;
        hr.setAttribute('data-color', c);
      };
      paint(String(node.attrs['color'] ?? 'default'));
      wrap.appendChild(hr);

      const palette = document.createElement('div');
      palette.className =
        'absolute -top-2.5 right-0 hidden gap-1 rounded border border-zinc-200 bg-white p-1 shadow-sm group-hover/hr:flex dark:border-zinc-700 dark:bg-zinc-900';
      palette.setAttribute('contenteditable', 'false');
      palette.setAttribute('data-hr-palette', '');
      for (const c of HR_COLORS) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `h-3.5 w-3.5 rounded-full ${hrSwatchClass(c)}`;
        btn.setAttribute('data-hr-color', c);
        btn.title = c;
        btn.addEventListener('mousedown', (e) => {
          e.preventDefault();
          if (typeof getPos !== 'function') return;
          editor
            .chain()
            .focus()
            .command(({ tr }) => {
              tr.setNodeAttribute(getPos(), 'color', c);
              return true;
            })
            .run();
        });
        palette.appendChild(btn);
      }
      wrap.appendChild(palette);

      return {
        dom: wrap,
        ignoreMutation: () => true,
        update: (updated) => {
          if (updated.type.name !== 'horizontalRule') return false;
          paint(String(updated.attrs['color'] ?? 'default'));
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setHorizontalRule:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).run(),
    };
  },

  addInputRules() {
    return [nodeInputRule({ find: /^(?:---|___)$/, type: this.type })];
  },
});
