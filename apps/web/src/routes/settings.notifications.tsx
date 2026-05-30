/**
 * /settings/notifications — 外部チャネル配信設定 (PBI-11)。
 *
 * MVP は Slack incoming webhook のみ。GitHub Slack 連携と同じ流儀で、
 * https://hooks.slack.com/services/T0.../B0.../... 形式の URL を入力する。
 * 入力済みの URL はマスク表示（先頭 28 文字のみ）して、再編集時は
 * フルで貼り直す。
 *
 * admin 限定。member 以下が開くと API 側で FORBIDDEN になり、UI に
 * 「権限がありません」を出す。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/settings/notifications')({
  component: NotificationsSettings,
});

function NotificationsSettings() {
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });
  const current = useCurrentWorkspaceFromList(workspaces.data);
  if (!current) {
    return <p className="mx-auto max-w-3xl px-6 py-12 text-zinc-500">読み込み中…</p>;
  }
  return <ChannelsPanel workspaceId={current.id} />;
}

function ChannelsPanel({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['notificationChannel', 'list', workspaceId],
    queryFn: () => trpc.notificationChannel.list.query({ workspaceId }),
  });

  const [webhookUrl, setWebhookUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  const slack = (list.data ?? []).find((c) => c.kind === 'slack');

  const setSlack = useMutation({
    mutationFn: (url: string) =>
      trpc.notificationChannel.setSlack.mutate({
        workspaceId,
        webhookUrl: url,
        kinds: [], // 全 kind を配信
        enabled: true,
      }),
    onSuccess: async () => {
      setWebhookUrl('');
      setError(null);
      await qc.invalidateQueries({ queryKey: ['notificationChannel', 'list', workspaceId] });
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : '保存に失敗しました。');
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => trpc.notificationChannel.remove.mutate({ id }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notificationChannel', 'list', workspaceId] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">通知の外部配信</h1>
        <p className="mt-2 text-sm text-zinc-500">
          メンション通知やコメント返信を Slack に転送できる。MVP は Slack incoming
          webhook のみ対応。Email 配信は今後の PBI で着地予定。
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-2 text-sm font-medium">Slack incoming webhook</h2>
        {slack ? (
          <div className="mb-3 flex items-center justify-between rounded-md bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-950">
            <span className="font-mono text-xs text-zinc-500" data-testid="slack-current">
              {slack.slackWebhookUrl}
            </span>
            <button
              type="button"
              onClick={() => remove.mutate(slack.id)}
              disabled={remove.isPending}
              data-testid="slack-remove"
              className="text-xs text-red-500 hover:underline disabled:opacity-50"
            >
              削除
            </button>
          </div>
        ) : (
          <p className="mb-3 text-xs text-zinc-500">まだ設定されていません。</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (!webhookUrl.trim()) return;
            setSlack.mutate(webhookUrl.trim());
          }}
          className="space-y-2"
        >
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.currentTarget.value)}
            placeholder="https://hooks.slack.com/services/T0.../B0.../..."
            data-testid="slack-webhook-input"
            className="w-full rounded border border-zinc-300 bg-white px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
          />
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={setSlack.isPending || !webhookUrl.trim()}
              data-testid="slack-webhook-save"
              className="rounded bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-60"
            >
              保存
            </button>
          </div>
        </form>
        <p className="mt-3 text-xs text-zinc-500">
          Slack で「Add to Slack」→ Incoming Webhooks → 投稿先チャンネルを選ぶと
          発行される URL を貼り付ける。投稿は <code>actorName — body</code> の
          シンプル text。秘匿性が高いので保存後は先頭の一部しか表示しない。
        </p>
      </section>
    </div>
  );
}
