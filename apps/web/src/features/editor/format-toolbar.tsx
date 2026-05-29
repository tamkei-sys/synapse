/**
 * エディタ上部の整形ツールバー + 選択時 BubbleMenu (PBI-33)。
 *
 * 整形タイミング設計:
 *   - 上部ツールバー: 常時表示。マークダウンに不慣れなユーザー / モバイルで
 *     IME の関係でショートカットが効きづらいケースの主導線。
 *   - BubbleMenu: 選択中だけ浮かぶ。クリックでトグル。デスクトップでは
 *     これがメインの整形手段。
 *   - typing-time の input rules (`**bold**` 等) は StarterKit が処理。
 *
 * 「コピー」ドロップダウンで MD / HTML を即クリップボードへ。インポート
 * ボタンは file input を開いて MD / HTML テキストを Editor に投入。
 */
import { type Editor } from '@tiptap/core';
import { BubbleMenu } from '@tiptap/react';
import { useRef, useState } from 'react';

import { markdownToHtml, tiptapJsonToMarkdown } from './markdown.js';

type Props = {
  editor: Editor | null;
};

export function FormatToolbar({ editor }: Props) {
  const [copied, setCopied] = useState<null | 'md' | 'html'>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!editor) return null;

  const copy = async (kind: 'md' | 'html') => {
    const text =
      kind === 'md' ? tiptapJsonToMarkdown(editor.getJSON()) : editor.getHTML();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // フォールバック: 一時 textarea で execCommand。最近のブラウザは
      // ほぼ navigator.clipboard が通るので、エラー時は黙る。
    }
  };

  const importFile = async (file: File) => {
    const text = await file.text();
    const html = file.name.endsWith('.md')
      ? markdownToHtml(text)
      : looksLikeHtml(text)
        ? text
        : markdownToHtml(text);
    editor.commands.insertContent(html);
  };

  return (
    <>
      <div
        data-testid="editor-toolbar"
        className="mb-2 flex flex-wrap items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50/60 px-2 py-1 text-xs dark:border-zinc-800 dark:bg-zinc-900/30"
      >
        <Group>
          <ToolbarButton
            label="太字 (Ctrl+B)"
            testid="fmt-bold"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            label="斜体 (Ctrl+I)"
            testid="fmt-italic"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            label="下線 (Ctrl+U)"
            testid="fmt-underline"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <u>U</u>
          </ToolbarButton>
          <ToolbarButton
            label="取り消し線"
            testid="fmt-strike"
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
          >
            <s>S</s>
          </ToolbarButton>
          <ToolbarButton
            label="インラインコード"
            testid="fmt-code"
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
          >
            {'<>'}
          </ToolbarButton>
        </Group>
        <Divider />
        <Group>
          {([1, 2, 3] as const).map((lvl) => (
            <ToolbarButton
              key={lvl}
              label={`見出し ${lvl}`}
              testid={`fmt-h${lvl}`}
              active={editor.isActive('heading', { level: lvl })}
              onClick={() => editor.chain().focus().toggleHeading({ level: lvl }).run()}
            >
              H{lvl}
            </ToolbarButton>
          ))}
        </Group>
        <Divider />
        <Group>
          <ToolbarButton
            label="箇条書き"
            testid="fmt-bullet"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            •
          </ToolbarButton>
          <ToolbarButton
            label="番号付き"
            testid="fmt-ordered"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            label="チェックリスト"
            testid="fmt-task"
            active={editor.isActive('taskList')}
            onClick={() => editor.chain().focus().toggleTaskList().run()}
          >
            ☑
          </ToolbarButton>
          <ToolbarButton
            label="引用"
            testid="fmt-quote"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            ❝
          </ToolbarButton>
          <ToolbarButton
            label="コードブロック"
            testid="fmt-codeblock"
            active={editor.isActive('codeBlock')}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            {'{ }'}
          </ToolbarButton>
        </Group>
        <Divider />
        <Group>
          <ToolbarButton
            label="リンク (Ctrl+K)"
            testid="fmt-link"
            active={editor.isActive('link')}
            onClick={() => {
              const prev = editor.getAttributes('link')['href'] as string | undefined;
              const url = window.prompt('リンク URL', prev ?? 'https://');
              if (url === null) return;
              if (url === '') editor.chain().focus().unsetLink().run();
              else
                editor
                  .chain()
                  .focus()
                  .extendMarkRange('link')
                  .setLink({ href: url })
                  .run();
            }}
          >
            🔗
          </ToolbarButton>
        </Group>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            data-testid="fmt-import"
            className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title=".md / .html をインポート"
          >
            📥 取り込み
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".md,.markdown,.html,.htm,text/markdown,text/html,text/plain"
            className="hidden"
            data-testid="fmt-import-input"
            onChange={(e) => {
              const f = e.currentTarget.files?.[0];
              if (f) void importFile(f);
              // 同じファイル再選択を許す
              e.currentTarget.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => copy('md')}
            data-testid="fmt-copy-md"
            className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="Markdown としてコピー"
          >
            {copied === 'md' ? '✓ MD' : '📋 MD'}
          </button>
          <button
            type="button"
            onClick={() => copy('html')}
            data-testid="fmt-copy-html"
            className="rounded px-2 py-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            title="HTML としてコピー"
          >
            {copied === 'html' ? '✓ HTML' : '📋 HTML'}
          </button>
        </div>
      </div>

      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 100 }}
        shouldShow={({ from, to, state }) => {
          if (from === to) return false;
          // CodeBlock 内は MD マークが効かないので出さない
          const $from = state.doc.resolve(from);
          if ($from.parent.type.name === 'codeBlock') return false;
          return true;
        }}
      >
        <div
          data-testid="bubble-menu"
          className="flex items-center gap-0.5 rounded-md border border-zinc-300 bg-white p-1 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <BubbleButton
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
            testid="bubble-bold"
          >
            <strong>B</strong>
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
            testid="bubble-italic"
          >
            <em>I</em>
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            label="Underline"
            testid="bubble-underline"
          >
            <u>U</u>
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            label="Strike"
            testid="bubble-strike"
          >
            <s>S</s>
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('code')}
            onClick={() => editor.chain().focus().toggleCode().run()}
            label="Code"
            testid="bubble-code"
          >
            {'<>'}
          </BubbleButton>
          <BubbleButton
            active={editor.isActive('link')}
            onClick={() => {
              const url = window.prompt(
                'リンク URL',
                (editor.getAttributes('link')['href'] as string | undefined) ?? 'https://',
              );
              if (url === null) return;
              if (url === '') editor.chain().focus().unsetLink().run();
              else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
            }}
            label="Link"
            testid="bubble-link"
          >
            🔗
          </BubbleButton>
        </div>
      </BubbleMenu>
    </>
  );
}

function ToolbarButton({
  children,
  active,
  onClick,
  label,
  testid,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      data-active={active}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={`min-w-7 rounded px-1.5 py-1 transition-colors ${
        active
          ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
          : 'text-zinc-700 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function BubbleButton({
  children,
  active,
  onClick,
  label,
  testid,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  label: string;
  testid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      data-active={active}
      aria-pressed={active}
      aria-label={label}
      className={`min-w-7 rounded px-2 py-1 transition-colors ${
        active
          ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />;
}

function looksLikeHtml(s: string): boolean {
  const t = s.trim();
  return t.startsWith('<') && /<\/?[a-zA-Z]/.test(t);
}
