/**
 * `dateMention` — インライン日付メンション (PBI-67)。
 *
 * Notion の `@日付` 相当。ISO 日付 (yyyy-mm-dd) を attr に持ち、表示は
 * 相対表記（今日 / 明日 / 昨日 / N 日後 / N 日前）+ 絶対日付。
 * クリックで <input type="date"> を出してその場で変更できる。
 *
 * Collaboration: attr は date 文字列のみ。相対表記は各クライアントが
 * 自分の「今日」で描画する（保存値は絶対日付なのでズレない）。
 */
import { mergeAttributes, Node } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from '@tiptap/react';
import { useState } from 'react';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    dateMention: {
      insertDateMention: (isoDate: string) => ReturnType;
    };
  }
}

/** ローカル「今日」を yyyy-mm-dd で返す（UTC ずれ回避のため getFullYear 等を使う）。 */
function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 2 つの yyyy-mm-dd の差（日数）。a - b。 */
function diffDays(a: string, b: string): number | null {
  const da = Date.parse(`${a}T00:00:00`);
  const db = Date.parse(`${b}T00:00:00`);
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  return Math.round((da - db) / 86_400_000);
}

export function formatRelativeDate(iso: string): string {
  if (!iso) return '日付なし';
  const delta = diffDays(iso, todayIso());
  if (delta === null) return iso;
  if (delta === 0) return '今日';
  if (delta === 1) return '明日';
  if (delta === -1) return '昨日';
  if (delta === 2) return '明後日';
  if (delta === -2) return '一昨日';
  const abs = iso.replace(/^\d+-/, '').replace('-', '/'); // MM/DD
  if (delta > 0) return `${delta}日後 (${abs})`;
  return `${-delta}日前 (${abs})`;
}

export const DateMentionNode = Node.create({
  name: 'dateMention',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      date: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-date') ?? '',
        renderHTML: (attrs) => ({ 'data-date': attrs['date'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-date-mention]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-date-mention': '' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateMentionView);
  },

  addCommands() {
    return {
      insertDateMention:
        (isoDate: string) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { date: isoDate || todayIso() } })
            .insertContent(' ')
            .run(),
    };
  },
});

function DateMentionView({ node, updateAttributes }: ReactNodeViewProps) {
  const date = String(node.attrs['date'] ?? '');
  const [editing, setEditing] = useState(false);

  return (
    <NodeViewWrapper
      as="span"
      data-testid={`date-mention-${date}`}
      data-date={date}
      className="not-prose inline-flex select-none items-center gap-1 rounded-md border border-zinc-200 bg-sky-50 px-1.5 py-0.5 align-baseline text-sm text-sky-900 dark:border-zinc-700 dark:bg-sky-900/30 dark:text-sky-100"
      contentEditable={false}
    >
      <span aria-hidden>📅</span>
      {editing ? (
        <input
          type="date"
          defaultValue={date}
          autoFocus
          data-testid="date-mention-input"
          onBlur={(e) => {
            const v = e.currentTarget.value;
            if (v) updateAttributes({ date: v });
            setEditing(false);
          }}
          className="bg-transparent text-sm focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          data-testid="date-mention-label"
          className="font-medium"
        >
          {formatRelativeDate(date)}
        </button>
      )}
    </NodeViewWrapper>
  );
}
