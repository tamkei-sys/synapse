/**
 * 軽量絵文字ピッカー (PBI-51)。
 *
 * 外部ライブラリ (emoji-mart 等は ~100KB) を避け、ページアイコンに使われ
 * がちな絵文字のプリセットグリッドだけ出す。十分でなければ後で差し替え。
 */
import { useEffect, useRef } from 'react';

const PRESET_EMOJIS = [
  '📄', '📝', '📋', '📑', '📚', '📖', '📓', '📔',
  '🗂️', '📁', '📂', '🗃️', '🗒️', '✏️', '✒️', '🖊️',
  '💡', '🔥', '⭐', '✅', '☑️', '🎯', '🚀', '🛠️',
  '⚙️', '🔧', '🧪', '🔬', '📊', '📈', '📉', '💰',
  '🗓️', '📅', '⏰', '🔔', '💬', '📣', '🏷️', '🔖',
  '🌱', '🌟', '🎨', '🧩', '🧠', '👀', '🤝', '🏁',
] as const;

export function EmojiPicker({
  onPick,
  onClose,
}: {
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      data-testid="emoji-picker"
      className="absolute left-0 top-full z-30 mt-1 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-8 gap-0.5">
        {PRESET_EMOJIS.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => {
              onPick(e);
              onClose();
            }}
            data-testid={`emoji-${e}`}
            className="flex h-7 w-7 items-center justify-center rounded text-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            {e}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          onPick('');
          onClose();
        }}
        data-testid="emoji-clear"
        className="mt-1 w-full rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        アイコンを削除
      </button>
    </div>
  );
}
