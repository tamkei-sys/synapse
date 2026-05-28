/**
 * TipTap editor for a single page.
 *
 * Responsibilities:
 *   - Hydrate from the page's stored PM JSON (`initialDoc`).
 *   - Surface every JSON document update via `onDocChange`.
 *   - Render in Tailwind prose styles with `editor-content` test id so E2E
 *     can target the contenteditable surface.
 *
 * The autosave + version-bookkeeping is owned by the consumer (the page
 * route component) — this component is intentionally dumb.
 */
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, type JSONContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';

import { SlashCommandExtension } from './slash-extension.js';
import type { PageDoc } from './types.js';

type EditorProps = {
  initialDoc: PageDoc;
  onDocChange: (doc: PageDoc) => void;
};

export function PageEditor({ initialDoc, onDocChange }: EditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing — press “/” for commands…',
      }),
      SlashCommandExtension,
    ],
    content: initialDoc as JSONContent,
    editorProps: {
      attributes: {
        class:
          'tiptap prose prose-zinc max-w-none focus:outline-none dark:prose-invert min-h-[12rem]',
        'data-testid': 'editor-content',
      },
    },
    onUpdate: ({ editor: e }) => {
      onDocChange(e.getJSON() as PageDoc);
    },
    immediatelyRender: false,
  });

  // If a fresh load delivers a different doc (e.g. CONFLICT → reload), sync
  // it in without losing focus.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(initialDoc)) {
      editor.commands.setContent(initialDoc as JSONContent, false);
    }
    // `editor` is intentionally omitted from deps — the instance is stable
    // for the lifetime of the component and including it would loop on
    // every render. Re-enable react-hooks linting if it's added later.
  }, [initialDoc]);

  return <EditorContent editor={editor} />;
}
