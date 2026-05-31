/**
 * キーボードショートカット一覧モーダル (PBI-91)。
 *
 * `?`（Shift+/）でグローバルに開く。入力中（input/textarea/contenteditable）は
 * 無視して、テキスト編集を邪魔しない。Esc / 背景クリックで閉じる。
 */
import { useEffect, useState } from 'react';

type Shortcut = { keys: string[]; desc: string };
type Group = { title: string; items: Shortcut[] };

const GROUPS: readonly Group[] = [
  {
    title: '全体',
    items: [
      { keys: ['⌘/Ctrl', 'K'], desc: 'コマンドパレットを開く（横断ジャンプ）' },
      { keys: ['?'], desc: 'このショートカット一覧を開く' },
      { keys: ['Esc'], desc: 'モーダル / ポップオーバーを閉じる' },
    ],
  },
  {
    title: 'エディタ',
    items: [
      { keys: ['/'], desc: 'スラッシュメニュー（ブロック挿入）' },
      { keys: ['@'], desc: 'ページメンション / リンク' },
      { keys: ['⌘/Ctrl', 'B'], desc: '太字' },
      { keys: ['⌘/Ctrl', 'I'], desc: '斜体' },
      { keys: ['⌘/Ctrl', 'Z'], desc: '元に戻す' },
    ],
  },
];

function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

export function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        return;
      }
      // `?` は Shift+/ で入る。入力中は無視。
      if (e.key === '?' && !isEditableTarget(e.target)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      data-testid="shortcuts-modal"
      role="dialog"
      aria-modal="true"
      aria-label="キーボードショートカット"
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">⌨️ キーボードショートカット</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            data-testid="shortcuts-close"
            className="rounded px-2 py-1 text-sm text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {g.title}
              </h3>
              <ul className="space-y-1.5">
                {g.items.map((s) => (
                  <li key={s.desc} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-zinc-600 dark:text-zinc-300">{s.desc}</span>
                    <span className="flex shrink-0 gap-1">
                      {s.keys.map((k) => (
                        <kbd
                          key={k}
                          className="rounded border border-zinc-300 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                        >
                          {k}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
