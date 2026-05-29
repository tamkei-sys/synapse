/**
 * TipTap editor backed by a shared Yjs document.
 *
 * The CRDT is owned by `useCollabDoc`; here we just plug it into TipTap's
 * Collaboration extension. The history extension that StarterKit ships is
 * incompatible with Collaboration (both manage undo state), so we drop it
 * — Yjs supplies its own undo manager via Collaboration.
 *
 * PBI-33: マークダウン / HTML 入出力対応
 *   - Link / Underline / TaskList / TaskItem 拡張を追加
 *   - StarterKit の input rules で `**bold**` `# H1` `> quote` 等は即時整形
 *   - MarkdownPasteExtension が plain text paste を MD 判定して HTML 化
 *   - FormatToolbar (上部固定) + BubbleMenu (選択中) + コピー/取り込み
 *
 * `editor-content` data-testid stays so Playwright can target the
 * contenteditable surface unchanged from S2.
 */
import { Color } from '@tiptap/extension-color';
import Collaboration from '@tiptap/extension-collaboration';
import Highlight from '@tiptap/extension-highlight';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
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
import { useMemo } from 'react';
import type * as Y from 'yjs';

import { makeAiSlashCommand } from './ai-slash.js';
import { CalloutNode } from './callout-node.js';
import { CodeBlockHighlighted } from './code-block.js';
import { DateMentionNode } from './date-mention-node.js';
import { EmbedNode } from './embed-node.js';
import { InlineMathNode, MathBlockNode } from './math-node.js';
import { FindBar } from './find-bar.js';
import { FindExtension } from './find.js';
import { FormatToolbar } from './format-toolbar.js';
import { MarkdownPasteExtension } from './markdown-paste.js';
import { PageMentionExtension } from './page-mention.js';
import { TocNode } from './toc-node.js';
import { ToggleDetails, ToggleNode, ToggleSummary } from './toggle-node.js';
import { PageRefNode } from './page-ref-node.js';
import { makePageSlashCommand } from './page-slash.js';
import { PbiRefNode } from './pbi-ref-node.js';
import { makePbiSlashCommand } from './pbi-slash.js';
import { PrDiffEmbedNode } from './pr-diff-node.js';
import { makePrSlashCommand } from './pr-slash.js';
import { makeProjectSlashCommand } from './project-slash.js';
import { SheetEmbedNode } from './sheet-embed-node.js';
import { makeSheetSlashCommand } from './sheet-slash.js';
import { SlashCommandExtension } from './slash-extension.js';
import { SLASH_COMMANDS } from './slash-menu.js';
import { makeSprintSlashCommand } from './sprint-slash.js';

type EditorProps = {
  doc: Y.Doc;
  workspaceId: string;
  /**
   * 親ページの block id。/page スラッシュコマンドが「ここの子」として
   * サブページを作るのに使う。 undefined ならトップレベル page を作る。
   */
  parentPageId?: string;
};

export function PageEditor({ doc, workspaceId, parentPageId }: EditorProps) {
  // Per-workspace closure for the /pbi command. Stable across renders as
  // long as the route's workspaceId doesn't change.
  const slashCommands = useMemo(
    () => [
      ...SLASH_COMMANDS,
      makeProjectSlashCommand(workspaceId),
      makeSprintSlashCommand(workspaceId),
      makePbiSlashCommand(workspaceId),
      makeSheetSlashCommand(workspaceId),
      makePrSlashCommand(),
      makePageSlashCommand(workspaceId, parentPageId),
      makeAiSlashCommand(workspaceId),
    ],
    [workspaceId, parentPageId],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Yjs Collaboration provides its own undo manager.
        history: false,
        // codeBlock は CodeBlockLowlight に差し替えるので無効化。
        codeBlock: false,
      }),
      CodeBlockHighlighted,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
          class: 'text-violet-600 underline hover:text-violet-500 dark:text-violet-300',
        },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CalloutNode,
      ToggleNode,
      ToggleSummary,
      ToggleDetails,
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      EmbedNode,
      TocNode,
      Placeholder.configure({
        placeholder: 'ここに入力 — 「/」でコマンドメニュー',
      }),
      Collaboration.configure({ document: doc }),
      PbiRefNode,
      PageRefNode,
      DateMentionNode,
      InlineMathNode,
      MathBlockNode,
      SheetEmbedNode,
      PrDiffEmbedNode,
      SlashCommandExtension.configure({ commands: slashCommands }),
      PageMentionExtension.configure({ workspaceId }),
      FindExtension,
      MarkdownPasteExtension,
    ],
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-zinc max-w-none focus:outline-none dark:prose-invert min-h-[12rem]',
        'data-testid': 'editor-content',
      },
    },
    immediatelyRender: false,
  });

  return (
    <div data-testid="editor-shell">
      <FindBar editor={editor} />
      <FormatToolbar editor={editor} workspaceId={workspaceId} />
      <EditorContent editor={editor} />
    </div>
  );
}
