/**
 * 公開ページ (PBI-56) の read-only レンダラ。
 *
 * getPublicPage が返すサニタイズ済み doc を TipTap の editable:false で描画する。
 * Collaboration / slash / mention / コメント等の編集・社内機能は積まず、表示系の
 * 拡張だけを持つ。ここの拡張セットは apps/api .../lib/public-doc.ts の
 * ALLOWED_NODES と一致させること（サニタイザが通したノードを描画できるように）。
 *
 * doc は呼び出し側が取得完了後に確定値で渡す前提（content は初期化時固定）。
 */
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextStyle from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { BookmarkNode } from './bookmark-node.js';
import { ColumnListNode, ColumnNode } from './column-node.js';
import { CalloutNode } from './callout-node.js';
import { CodeBlockHighlighted } from './code-block.js';
import { DateMentionNode } from './date-mention-node.js';
import { InlineMathNode, MathBlockNode } from './math-node.js';
import { MermaidBlockNode } from './mermaid-node.js';
import { TocNode } from './toc-node.js';
import { ToggleDetails, ToggleNode, ToggleSummary } from './toggle-node.js';

export function PublicPageEditor({ doc }: { doc: unknown }) {
  const editor = useEditor({
    editable: false,
    content: (doc as Record<string, unknown>) ?? { type: 'doc', content: [] },
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      CodeBlockHighlighted,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
          class: 'text-violet-600 underline hover:text-violet-500 dark:text-violet-300',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Image.configure({ inline: false, HTMLAttributes: { class: 'rounded-md' } }),
      BookmarkNode,
      ColumnListNode,
      ColumnNode,
      CalloutNode,
      ToggleNode,
      ToggleSummary,
      ToggleDetails,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      TocNode,
      InlineMathNode,
      MathBlockNode,
      MermaidBlockNode,
      DateMentionNode,
    ],
    editorProps: {
      attributes: {
        class: 'tiptap prose prose-zinc max-w-none dark:prose-invert',
        'data-testid': 'public-editor-content',
      },
    },
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} />;
}
