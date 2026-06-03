/**
 * 「cc で実装」ボタン (PBI-117 で共通化)。
 *
 * PBI を 1 つ指定すると、その PBI に対する headless Claude Code セッションを
 * 起動し（trpc.cc.startForPbi）、進行状況をポーリング表示する。完了すると
 * 生成された PR へのリンクに変わる。PBI 一覧・カンバン・詳細・配下一覧など、
 * PBI が出てくるあらゆる面で再利用する。
 *
 * 元は apps/web/src/routes/pbi.tsx 内のローカル実装。挙動は変えていない。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { trpc } from '../../lib/trpc.js';

export function ImplementButton({ pbiId }: { pbiId: string }) {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['cc', 'getForPbi', pbiId],
    queryFn: () => trpc.cc.getForPbi.query({ pbiId }),
    refetchInterval: (q) => {
      const data = q.state.data as { status?: string } | null | undefined;
      if (!data) return false;
      return data.status === 'queued' || data.status === 'running' ? 1_000 : false;
    },
  });

  const start = useMutation({
    mutationFn: () => trpc.cc.startForPbi.mutate({ pbiId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cc', 'getForPbi', pbiId] }),
  });

  const status = session.data?.status as string | undefined;
  const prUrl = session.data?.prUrl as string | null | undefined;
  const inFlight = status === 'queued' || status === 'running';
  const succeeded = status === 'succeeded';

  if (succeeded && prUrl) {
    return (
      <a
        href={prUrl}
        target="_blank"
        rel="noreferrer"
        data-testid={`pbi-cc-pr-${pbiId}`}
        className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700/60 dark:bg-emerald-900/30 dark:text-emerald-300"
      >
        PR を開く ↗
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => start.mutate()}
      disabled={start.isPending || inFlight}
      data-testid={`pbi-implement-${pbiId}`}
      data-cc-status={status ?? 'idle'}
      className="rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700/60 dark:bg-violet-900/30 dark:text-violet-300"
    >
      {inFlight ? '実装中…' : 'cc で実装'}
    </button>
  );
}
