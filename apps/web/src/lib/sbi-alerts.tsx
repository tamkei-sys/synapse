/**
 * SBI のアラート表示（PBI-106）。大和心 Notion の `アラート1/アラート2/経過日数`
 * を一般化したもの。
 *   - 超過: 実績 > 見積（isOverEstimate）
 *   - 停滞: in_progress が閾値(4日)超（isStale）
 *   - 経過: 着手からの経過日数（elapsedDays）
 * board / SBI 詳細 / PBI 配下一覧で共通利用する。
 */
import { elapsedDays, isOverEstimate, isStale, type SbiStatus } from '@synapse/blocks';

export type SbiAlertInput = {
  id?: string;
  status?: SbiStatus;
  estimateHours?: number;
  actualHours?: number;
  startedAt?: string;
  completedAt?: string;
};

/** この SBI が「要注意」(超過 or 停滞) か。PBI のロールアップ集計に使う。 */
export function sbiNeedsAttention(sbi: SbiAlertInput): boolean {
  return isOverEstimate(sbi) === true || isStale({ status: sbi.status ?? 'todo', startedAt: sbi.startedAt }) === true;
}

export function SbiAlertBadges({ sbi }: { sbi: SbiAlertInput }) {
  const over = isOverEstimate(sbi) === true;
  const stale = isStale({ status: sbi.status ?? 'todo', startedAt: sbi.startedAt }) === true;
  const days = elapsedDays(sbi);
  const tid = (suffix: string) => (sbi.id ? { 'data-testid': `sbi-${suffix}-${sbi.id}` } : {});
  return (
    <>
      {over ? (
        <span
          {...tid('over')}
          title="実績が見積を超過"
          className="rounded bg-amber-100 px-1 font-mono text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
        >
          超過
        </span>
      ) : null}
      {stale ? (
        <span
          {...tid('stale')}
          title="着手から4日以上 進行中のまま"
          className="rounded bg-red-100 px-1 font-mono text-red-700 dark:bg-red-900/40 dark:text-red-300"
        >
          停滞
        </span>
      ) : null}
      {typeof days === 'number' && days >= 1 ? (
        <span
          {...tid('elapsed')}
          title="着手からの経過日数"
          className="rounded bg-zinc-100 px-1 font-mono text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {days}d 経過
        </span>
      ) : null}
    </>
  );
}
