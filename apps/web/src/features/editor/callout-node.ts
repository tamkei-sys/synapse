/**
 * `callout` — Notion 風の囲みブロック (PBI-37)。
 *
 * 4 トーン: info / warning / success / note。`tone` 属性で見た目を切り替え、
 * 中身は通常のブロック（段落・リスト等）を入れられる container node。
 *
 * Collaboration 互換のため属性は単純な enum 文字列のみ。アイコンは
 * tone から CSS で導出する（属性に絵文字を埋め込まない）。
 */
import { mergeAttributes, Node } from '@tiptap/core';

export const CALLOUT_TONES = ['info', 'warning', 'success', 'note'] as const;
export type CalloutTone = (typeof CALLOUT_TONES)[number];

const TONE_EMOJI: Record<CalloutTone, string> = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  note: '📝',
};

const TONE_CLASS: Record<CalloutTone, string> = {
  info: 'border-sky-300 bg-sky-50 dark:border-sky-800 dark:bg-sky-950/40',
  warning: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
  success: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
  note: 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40',
};

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    callout: {
      setCallout: (tone?: CalloutTone) => ReturnType;
      cycleCalloutTone: () => ReturnType;
    };
  }
}

function normalizeTone(v: unknown): CalloutTone {
  return CALLOUT_TONES.includes(v as CalloutTone) ? (v as CalloutTone) : 'info';
}

export const CalloutNode = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      tone: {
        default: 'info',
        parseHTML: (el) => normalizeTone(el.getAttribute('data-tone')),
        renderHTML: (attrs) => ({ 'data-tone': normalizeTone(attrs['tone']) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const tone = normalizeTone(node.attrs['tone']);
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-callout': '',
        'data-tone': tone,
        'data-emoji': TONE_EMOJI[tone],
        class: `not-prose my-3 flex gap-2 rounded-md border px-3 py-2 ${TONE_CLASS[tone]}`,
      }),
      // 絵文字を ::before で出すのではなく contentEditable=false の span を
      // 持たせると Yjs で複製されてしまうため、CSS data 属性に寄せて
      // styles.css 側の ::before で描画する。中身だけを子に持たせる。
      ['div', { class: 'min-w-0 flex-1', 'data-callout-body': '' }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        (tone = 'info') =>
        ({ commands }) =>
          commands.wrapIn(this.name, { tone }),
      cycleCalloutTone:
        () =>
        ({ editor, commands }) => {
          const current = normalizeTone(editor.getAttributes('callout')['tone']);
          const idx = CALLOUT_TONES.indexOf(current);
          const next = CALLOUT_TONES[(idx + 1) % CALLOUT_TONES.length] ?? 'info';
          return commands.updateAttributes(this.name, { tone: next });
        },
    };
  },
});
