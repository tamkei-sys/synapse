/**
 * ページ内検索バー (PBI-74)。
 *
 * Cmd/Ctrl+F でエディタ上に出す。入力で setSearchTerm、Enter / ↓ で次、
 * Shift+Enter / ↑ で前、Esc で閉じる。右側に「3 / 12」のヒット件数。
 *
 * ブラウザ標準の Cmd+F を奪うのは編集中だけ（エディタ shell にフォーカス
 * があるとき）。それ以外ではブラウザ検索に委ねる。
 */
import { type Editor } from '@tiptap/core';
import { useEffect, useRef, useState } from 'react';

import { getFindState } from './find.js';

export function FindBar({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [meta, setMeta] = useState<{ count: number; current: number }>({ count: 0, current: -1 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+F でトグル。エディタ DOM 内 or バー内にフォーカスがあるときだけ。
  useEffect(() => {
    if (!editor) return;
    const onKey = (e: KeyboardEvent) => {
      const isFind = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f';
      if (!isFind) return;
      const editorDom = editor.view.dom;
      const active = document.activeElement;
      const inEditor = editorDom.contains(active) || inputRef.current === active;
      if (!inEditor) return; // ブラウザ標準検索に委ねる
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editor]);

  // term 変更を editor に反映 + ヒット件数を読む。
  useEffect(() => {
    if (!editor) return;
    editor.commands.setSearchTerm(term);
    const st = getFindState(editor.state);
    if (st) setMeta({ count: st.count, current: st.current });
  }, [term, editor]);

  // editor の状態更新（移動など）に追従して件数表示を更新。
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const st = getFindState(editor.state);
      if (st) setMeta({ count: st.count, current: st.current });
    };
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);

  if (!editor || !open) return null;

  const close = () => {
    setOpen(false);
    setTerm('');
    editor.commands.clearSearch();
    editor.commands.focus();
  };

  return (
    <div
      data-testid="find-bar"
      className="sticky top-0 z-20 mb-2 flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
    >
      <span aria-hidden>🔍</span>
      <input
        ref={inputRef}
        value={term}
        onChange={(e) => setTerm(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) editor.commands.findPrev();
            else editor.commands.findNext();
          }
        }}
        placeholder="ページ内を検索"
        data-testid="find-input"
        className="min-w-0 flex-1 bg-transparent text-sm focus:outline-none"
      />
      <span data-testid="find-count" className="shrink-0 text-xs tabular-nums text-zinc-500">
        {meta.count > 0 ? `${meta.current + 1} / ${meta.count}` : term ? '0 件' : ''}
      </span>
      <button
        type="button"
        onClick={() => editor.commands.findPrev()}
        disabled={meta.count === 0}
        data-testid="find-prev"
        aria-label="前へ"
        className="rounded px-1.5 py-0.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ↑
      </button>
      <button
        type="button"
        onClick={() => editor.commands.findNext()}
        disabled={meta.count === 0}
        data-testid="find-next"
        aria-label="次へ"
        className="rounded px-1.5 py-0.5 text-sm text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ↓
      </button>
      <button
        type="button"
        onClick={close}
        data-testid="find-close"
        aria-label="閉じる"
        className="rounded px-1.5 py-0.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        ✕
      </button>
    </div>
  );
}
