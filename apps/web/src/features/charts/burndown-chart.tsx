/**
 * Sprint burndown の SVG チャート。
 *
 * 入力は sprint.metrics の points 配列。理想線（破線）と実績線
 * （バイオレット実線）を描画する。recharts 等は入れず手書きで完結。
 */
import type { ReactElement } from 'react';

type Point = {
  date: string;
  remaining: number;
  ideal: number;
  completedHours: number;
};

export function BurndownChart({
  points,
  totalHours,
  startDate,
  endDate,
}: {
  points: Point[];
  totalHours: number;
  startDate: string;
  endDate: string;
}): ReactElement | null {
  if (points.length === 0) return null;

  const W = 480;
  const H = 200;
  const padding = { top: 24, right: 16, bottom: 32, left: 36 };
  const innerW = W - padding.left - padding.right;
  const innerH = H - padding.top - padding.bottom;

  const maxY = Math.max(1, totalHours);
  const x = (i: number) => padding.left + (innerW * i) / Math.max(1, points.length - 1);
  const y = (v: number) => padding.top + innerH * (1 - v / maxY);

  const idealPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.ideal).toFixed(1)}`)
    .join(' ');
  const remainingPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.remaining).toFixed(1)}`)
    .join(' ');

  // y 軸の目盛り（4 等分）
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    yPx: padding.top + innerH * (1 - r),
    label: Math.round(maxY * r),
  }));

  const lastPoint = points[points.length - 1];

  return (
    <figure
      data-testid="burndown-chart"
      className="overflow-hidden rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <figcaption className="mb-1 flex items-baseline justify-between text-xs">
        <span className="font-medium text-zinc-700 dark:text-zinc-200">バーンダウン</span>
        <span className="font-mono text-[10px] text-zinc-500">
          {startDate} → {endDate} · 合計 {totalHours}h · 残 {lastPoint?.remaining ?? totalHours}h
        </span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-44 w-full"
        role="img"
        aria-label="バーンダウンチャート"
      >
        {/* y axis grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={W - padding.right}
              y1={t.yPx}
              y2={t.yPx}
              stroke="currentColor"
              strokeOpacity="0.1"
            />
            <text
              x={padding.left - 4}
              y={t.yPx + 3}
              fontSize="10"
              textAnchor="end"
              className="fill-zinc-500"
            >
              {t.label}
            </text>
          </g>
        ))}

        {/* x axis (start / end ラベルだけ) */}
        <text
          x={padding.left}
          y={H - padding.bottom + 18}
          fontSize="10"
          textAnchor="start"
          className="fill-zinc-500"
        >
          {startDate.slice(5)}
        </text>
        <text
          x={W - padding.right}
          y={H - padding.bottom + 18}
          fontSize="10"
          textAnchor="end"
          className="fill-zinc-500"
        >
          {endDate.slice(5)}
        </text>

        {/* ideal */}
        <path
          d={idealPath}
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeDasharray="4 4"
          strokeWidth="1.5"
          fill="none"
        />
        {/* remaining */}
        <path d={remainingPath} stroke="#8b5cf6" strokeWidth="2" fill="none" />
        {/* 実績点 */}
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.remaining)} r="2.5" fill="#8b5cf6" />
        ))}

        <g transform={`translate(${padding.left}, ${padding.top - 12})`}>
          <line x1="0" x2="14" y1="0" y2="0" stroke="#8b5cf6" strokeWidth="2" />
          <text x="18" y="3" fontSize="10" className="fill-zinc-500">
            残時間
          </text>
          <line
            x1="64"
            x2="78"
            y1="0"
            y2="0"
            stroke="currentColor"
            strokeOpacity="0.4"
            strokeDasharray="4 4"
          />
          <text x="82" y="3" fontSize="10" className="fill-zinc-500">
            理想線
          </text>
        </g>
      </svg>
    </figure>
  );
}
