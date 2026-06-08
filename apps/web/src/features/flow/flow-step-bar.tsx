/**
 * Bottom-center STEP indicator shown during playback: a step badge, the step
 * title, an optional description, and an optional code/formula snippet — the
 * "STEP N: …" caption from the reference visualization.
 */
import type { FlowStep } from '@synapse/blocks';

type Props = {
  step: FlowStep | null;
  index: number;
  total: number;
};

export function FlowStepBar({ step, index, total }: Props) {
  if (!step) return null;
  return (
    <div
      data-testid="flow-step-bar"
      className="absolute bottom-3 left-1/2 z-10 w-[min(620px,78%)] -translate-x-1/2 rounded-lg border border-violet-500/40 bg-zinc-900/92 px-4 py-2.5 shadow-xl backdrop-blur-sm"
    >
      <div className="flex items-baseline gap-2">
        <span className="shrink-0 rounded bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums tracking-wide text-white">
          STEP {index + 1}/{total}
        </span>
        <h4 className="truncate text-sm font-semibold text-zinc-50">{step.title}</h4>
      </div>
      {step.description ? (
        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-zinc-300">
          {step.description}
        </p>
      ) : null}
      {step.code ? (
        <pre className="mt-1.5 max-h-24 overflow-auto rounded bg-zinc-950/80 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-emerald-300">
          {step.code}
        </pre>
      ) : null}
    </div>
  );
}
