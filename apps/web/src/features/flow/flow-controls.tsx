/**
 * Floating top toolbar: playback transport (run-all / step / speed / reset)
 * on the left, view controls (fit / zoom) on the right. Pure presentational —
 * all state lives in the step player and pan-zoom hooks.
 */
import type { ReactNode } from 'react';

type Props = {
  playing: boolean;
  hasSteps: boolean;
  speed: number;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onCycleSpeed: () => void;
  onFit: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

function Btn({
  onClick,
  label,
  children,
  disabled,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={disabled}
      className="flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-sm text-zinc-300 transition-colors hover:bg-zinc-700/70 hover:text-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function FlowControls({
  playing,
  hasSteps,
  speed,
  onToggle,
  onPrev,
  onNext,
  onReset,
  onCycleSpeed,
  onFit,
  onZoomIn,
  onZoomOut,
}: Props) {
  return (
    <div className="absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-zinc-700/70 bg-zinc-900/85 px-1.5 py-1 shadow-lg backdrop-blur-sm">
      <Btn onClick={onPrev} label="前のステップ" disabled={!hasSteps}>
        ⏮
      </Btn>
      <button
        type="button"
        onClick={onToggle}
        disabled={!hasSteps}
        data-testid="flow-run-all"
        className="flex h-7 items-center gap-1.5 rounded-full bg-violet-600 px-3 text-xs font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden>{playing ? '⏸' : '▶'}</span>
        {playing ? '一時停止' : '一括実行'}
      </button>
      <Btn onClick={onNext} label="次のステップ" disabled={!hasSteps}>
        ⏭
      </Btn>
      <Btn onClick={onReset} label="先頭に戻す" disabled={!hasSteps}>
        ⟲
      </Btn>
      <button
        type="button"
        onClick={onCycleSpeed}
        aria-label="再生速度"
        title="再生速度"
        className="h-7 rounded-md px-2 text-xs font-medium tabular-nums text-zinc-300 transition-colors hover:bg-zinc-700/70 hover:text-zinc-50"
      >
        {speed}x
      </button>
      <span className="mx-1 h-4 w-px bg-zinc-700" aria-hidden />
      <Btn onClick={onFit} label="全体を表示">
        ⤢
      </Btn>
      <Btn onClick={onZoomOut} label="縮小">
        −
      </Btn>
      <Btn onClick={onZoomIn} label="拡大">
        ＋
      </Btn>
    </div>
  );
}
