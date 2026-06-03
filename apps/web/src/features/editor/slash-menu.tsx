/**
 * Slash command palette.
 *
 * Renders a tippy.js popup positioned at the caret whenever the user types
 * `/`. Filtering is substring-on-title-or-keyword; selection commits via
 * the Editor command chain so undo / redo work naturally.
 *
 * Items are intentionally kept inline (not a registry yet) so it's easy to
 * see the whole S2 surface in one screen. A registry lands when feature
 * plugins (e.g. `/pbi` for embeds) join the menu in S4.
 */
import type { Editor, Range } from '@tiptap/react';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

export type SlashCommand = {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  run: (editor: Editor, range: Range) => void;
};

export const SLASH_COMMANDS: readonly SlashCommand[] = [
  {
    id: 'heading-1',
    title: '見出し 1',
    description: '大きなセクション見出し',
    keywords: ['h1', '見出し', 'heading', 'title'],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'heading-2',
    title: '見出し 2',
    description: '中サイズのセクション見出し',
    keywords: ['h2', '見出し', 'heading'],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'heading-3',
    title: '見出し 3',
    description: '小サイズの見出し',
    keywords: ['h3', '見出し', 'heading'],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bullet-list',
    title: '箇条書き',
    description: '・印つきのリスト',
    keywords: ['箇条', 'list', 'ul', 'bullet'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'ordered-list',
    title: '番号付きリスト',
    description: '1, 2, 3 … の番号つきリスト',
    keywords: ['番号', 'list', 'ol', 'numbered'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'blockquote',
    title: '引用',
    description: '引用ブロック',
    keywords: ['引用', 'quote', 'blockquote'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    id: 'code-block',
    title: 'コードブロック',
    description: 'シンタックスハイライト付きコード領域',
    keywords: ['コード', 'code', 'snippet', 'pre'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
  {
    id: 'callout',
    title: 'Callout',
    description: '情報 / 注意 / 成功 / メモ の囲みブロック',
    keywords: ['callout', '囲み', 'info', 'warning', 'note', '注意', 'コールアウト'],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setCallout('info').run(),
  },
  {
    id: 'toggle',
    title: 'トグル',
    description: '折りたたみ可能なブロック',
    keywords: ['toggle', 'トグル', '折りたたみ', 'fold', 'collapse', 'details'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setToggle().run(),
  },
  {
    id: 'table',
    title: 'テーブル',
    description: '3×3 の表を挿入',
    keywords: ['table', '表', 'テーブル', 'grid'],
    run: (editor, range) =>
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: 'embed',
    title: '埋め込み',
    description: 'YouTube / Figma / Loom などを iframe 埋め込み',
    keywords: ['embed', '埋め込み', 'iframe', 'youtube', 'figma', 'loom'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt('埋め込む URL', 'https://');
      if (!url) return;
      editor.chain().focus().setEmbed(url).run();
    },
  },
  {
    id: 'columns',
    title: '2 カラム',
    description: '横並びの段組レイアウト',
    keywords: ['column', 'カラム', '段組', '多段', 'columns', '2列', 'レイアウト'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setColumns(2).run(),
  },
  {
    id: 'sync',
    title: '同期ブロック',
    description: '別ページの内容をライブ表示',
    keywords: ['sync', '同期', 'synced', '参照', 'ミラー', 'mirror'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertSyncedBlock().run(),
  },
  {
    id: 'divider',
    title: '区切り線',
    description: '色を変えられる水平線',
    keywords: ['divider', '区切り', '罫線', 'hr', 'rule', 'line', '線', 'セパレータ'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    id: 'toc',
    title: '目次',
    description: '見出しから自動生成される目次',
    keywords: ['toc', '目次', 'もくじ', 'outline', 'table of contents'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setTocBlock().run(),
  },
  {
    id: 'date',
    title: '日付',
    description: '日付メンション（相対表記）を挿入',
    keywords: ['date', '日付', 'today', '今日', 'カレンダー'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertDateMention('').run(),
  },
  {
    id: 'math-block',
    title: '数式ブロック',
    description: 'KaTeX で display 数式',
    keywords: ['math', '数式', 'katex', 'latex', 'tex', 'equation'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertMathBlock('').run(),
  },
  {
    id: 'inline-math',
    title: 'インライン数式',
    description: '文中の KaTeX 数式',
    keywords: ['imath', 'inline math', 'インライン数式', 'katex', 'latex'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertInlineMath('').run(),
  },
  {
    id: 'mermaid',
    title: 'Mermaid 図',
    description: 'フローチャート / シーケンス図などをコードから描画',
    keywords: ['mermaid', 'マーメイド', 'diagram', '図', 'フローチャート', 'flowchart', 'sequence', 'gantt', 'ダイアグラム'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertMermaidBlock().run(),
  },
];

/** Generic filter that works against any command list (built-in or user). */
export function filterCommandsFrom(source: readonly SlashCommand[], query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...source];
  return source.filter((cmd) => {
    if (cmd.title.toLowerCase().includes(q)) return true;
    return cmd.keywords.some((k) => k.includes(q));
  });
}

/** Backwards-compatible filter over the built-in list. */
export function filterCommands(query: string): SlashCommand[] {
  return filterCommandsFrom(SLASH_COMMANDS, query);
}

// ---- React popup ---------------------------------------------------------

export type SlashMenuRef = {
  /** Handle keyboard events forwarded from ProseMirror. Returns true if the
   * menu consumed the event. */
  onKeyDown: (event: KeyboardEvent) => boolean;
};

type SlashMenuProps = {
  items: SlashCommand[];
  command: (item: SlashCommand) => void;
};

export const SlashMenu = forwardRef<SlashMenuRef, SlashMenuProps>(function SlashMenu(
  { items, command },
  ref,
) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => setSelectedIndex(0), [items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + items.length - 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'Enter') {
        const picked = items[selectedIndex];
        if (picked) command(picked);
        return true;
      }
      return false;
    },
  }));

  const list = useMemo(() => items, [items]);

  if (list.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
        該当するコマンドがありません
      </div>
    );
  }

  return (
    <div
      role="listbox"
      data-testid="slash-menu"
      className="max-h-72 w-72 overflow-y-auto rounded-md border border-zinc-200 bg-white p-1 shadow-md dark:border-zinc-700 dark:bg-zinc-900"
    >
      {list.map((item, idx) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={idx === selectedIndex}
          data-testid={`slash-item-${item.id}`}
          onMouseDown={(e) => {
            e.preventDefault();
            command(item);
          }}
          onMouseEnter={() => setSelectedIndex(idx)}
          className={`flex w-full flex-col items-start rounded px-3 py-2 text-left text-sm ${
            idx === selectedIndex
              ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
              : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="font-medium">{item.title}</span>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{item.description}</span>
        </button>
      ))}
    </div>
  );
});
