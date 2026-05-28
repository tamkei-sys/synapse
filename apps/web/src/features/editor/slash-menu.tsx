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
    title: 'Heading 1',
    description: 'Large section heading',
    keywords: ['h1', 'title', 'heading'],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'heading-2',
    title: 'Heading 2',
    description: 'Medium section heading',
    keywords: ['h2', 'subtitle', 'heading'],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'heading-3',
    title: 'Heading 3',
    description: 'Small section heading',
    keywords: ['h3', 'heading'],
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bullet-list',
    title: 'Bulleted list',
    description: 'Simple bullet list',
    keywords: ['bullet', 'list', 'ul'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'ordered-list',
    title: 'Numbered list',
    description: 'List with numbering',
    keywords: ['numbered', 'list', 'ol', 'ordered'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'blockquote',
    title: 'Quote',
    description: 'Pull-quote style block',
    keywords: ['quote', 'blockquote', 'citation'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setBlockquote().run(),
  },
  {
    id: 'code-block',
    title: 'Code block',
    description: 'Fenced code with monospace font',
    keywords: ['code', 'snippet', 'pre'],
    run: (editor, range) => editor.chain().focus().deleteRange(range).setCodeBlock().run(),
  },
];

export function filterCommands(query: string): SlashCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...SLASH_COMMANDS];
  return SLASH_COMMANDS.filter((cmd) => {
    if (cmd.title.toLowerCase().includes(q)) return true;
    return cmd.keywords.some((k) => k.includes(q));
  });
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
        No matches
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
