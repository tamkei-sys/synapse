/**
 * TipTap editor backed by a shared Yjs document.
 *
 * The CRDT is owned by `useCollabDoc`; here we just plug it into TipTap's
 * Collaboration extension. The history extension that StarterKit ships is
 * incompatible with Collaboration (both manage undo state), so we drop it
 * — Yjs supplies its own undo manager via Collaboration.
 *
 * `editor-content` data-testid stays so Playwright can target the
 * contenteditable surface unchanged from S2.
 */
import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useMemo } from 'react';
import type * as Y from 'yjs';

import { PbiRefNode } from './pbi-ref-node.js';
import { makePbiSlashCommand } from './pbi-slash.js';
import { PrDiffEmbedNode } from './pr-diff-node.js';
import { makePrSlashCommand } from './pr-slash.js';
import { SheetEmbedNode } from './sheet-embed-node.js';
import { makeSheetSlashCommand } from './sheet-slash.js';
import { SlashCommandExtension } from './slash-extension.js';
import { SLASH_COMMANDS } from './slash-menu.js';

type EditorProps = {
  doc: Y.Doc;
  workspaceId: string;
};

export function PageEditor({ doc, workspaceId }: EditorProps) {
  // Per-workspace closure for the /pbi command. Stable across renders as
  // long as the route's workspaceId doesn't change.
  const slashCommands = useMemo(
    () => [
      ...SLASH_COMMANDS,
      makePbiSlashCommand(workspaceId),
      makeSheetSlashCommand(workspaceId),
      makePrSlashCommand(),
    ],
    [workspaceId],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Yjs Collaboration provides its own undo manager.
        history: false,
      }),
      Placeholder.configure({
        placeholder: 'Start typing — press “/” for commands…',
      }),
      Collaboration.configure({ document: doc }),
      PbiRefNode,
      SheetEmbedNode,
      PrDiffEmbedNode,
      SlashCommandExtension.configure({ commands: slashCommands }),
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

  return <EditorContent editor={editor} />;
}
