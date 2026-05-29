/**
 * ヘッダー右側の通知ベル。
 *
 * - workspace.unreadCount を 15s ごとに polling して未読数バッジを描画
 * - クリックで dropdown を開き notification.list（直近 30 件）を表示
 * - 行クリックで /b/$blockId に遷移し markRead
 * - 「全て既読」で markAllRead → ベルがクリーンに戻る
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { trpc } from '../../lib/trpc.js';
import { useDismissOnEscape } from '../../lib/use-dismiss.js';

type NotificationRow = Awaited<ReturnType<typeof trpc.notification.list.query>>[number];

type Tab = 'unread' | 'all';

export function NotificationBell({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('unread');
  const wrapRef = useRef<HTMLDivElement>(null);

  // 開閉のたびにタブを「未読」に戻す（永続化はしない）。
  useEffect(() => {
    if (open) setTab('unread');
  }, [open]);

  const unread = useQuery({
    queryKey: ['notification', 'unreadCount', workspaceId],
    queryFn: () => trpc.notification.unreadCount.query({ workspaceId }),
    refetchInterval: 15_000,
  });

  const list = useQuery({
    queryKey: ['notification', 'list', workspaceId, tab],
    queryFn: () =>
      trpc.notification.list.query({
        workspaceId,
        limit: 30,
        unreadOnly: tab === 'unread',
      }),
    enabled: open,
  });

  const markRead = useMutation({
    mutationFn: (notificationId: string) => trpc.notification.markRead.mutate({ notificationId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notification'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => trpc.notification.markAllRead.mutate({ workspaceId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notification'] });
    },
  });

  // dropdown 外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  useDismissOnEscape(open, () => setOpen(false));

  const count = unread.data?.count ?? 0;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="notification-bell"
        data-unread={count}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-zinc-300 bg-white hover:bg-zinc-100 md:h-9 md:w-9 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        aria-label={count > 0 ? `通知（未読 ${count} 件）` : '通知'}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="text-base">🔔</span>
        {count > 0 ? (
          <span
            data-testid="notification-bell-badge"
            className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white"
          >
            {count > 99 ? '99+' : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          data-testid="notification-dropdown"
          className="absolute right-0 z-20 mt-2 w-96 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <header className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 dark:border-zinc-700">
            <div
              className="flex items-center gap-2 text-sm"
              role="tablist"
              aria-label="通知フィルタ"
            >
              <TabButton value="unread" current={tab} onSelect={setTab} label={`未読 (${count})`} />
              <TabButton value="all" current={tab} onSelect={setTab} label="すべて" />
            </div>
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || count === 0}
              data-testid="notification-mark-all-read"
              className="text-xs text-violet-600 hover:underline disabled:opacity-40 dark:text-violet-300"
            >
              全て既読
            </button>
          </header>

          {list.isPending ? (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">読み込み中…</p>
          ) : list.data && list.data.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto py-1">
              {list.data.map((n) => (
                <NotificationItem
                  key={n.id}
                  row={n}
                  onClick={async () => {
                    if (!n.readAt) await markRead.mutateAsync(n.id).catch(() => undefined);
                    if (n.blockId) {
                      await navigate({ to: '/b/$blockId', params: { blockId: n.blockId } });
                    }
                    setOpen(false);
                  }}
                />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-zinc-500">
              {tab === 'unread' ? '未読の通知はありません。' : '通知はまだありません。'}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  value,
  current,
  onSelect,
  label,
}: {
  value: Tab;
  current: Tab;
  onSelect: (next: Tab) => void;
  label: string;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      data-testid={`notification-tab-${value}`}
      onClick={() => onSelect(value)}
      className={`rounded px-2 py-0.5 text-xs ${
        active
          ? 'bg-violet-100 font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
          : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {label}
    </button>
  );
}

function NotificationItem({ row, onClick }: { row: NotificationRow; onClick: () => void }) {
  const unread = !row.readAt;
  const actorName = row.actorName ?? '誰か';
  const initial = actorName.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        data-testid={`notification-item-${row.id}`}
        data-unread={unread}
        className={`flex w-full items-start gap-3 px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 ${
          unread ? 'bg-violet-50/60 dark:bg-violet-900/20' : ''
        }`}
      >
        {row.actorImage ? (
          <img
            src={row.actorImage}
            alt={actorName}
            className="h-8 w-8 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
            {initial}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate ${unread ? 'font-medium' : ''}`}>{row.body}</p>
          <p className="text-xs text-zinc-500">{new Date(row.createdAt).toLocaleString('ja-JP')}</p>
        </div>
        {unread ? (
          <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-violet-500" />
        ) : null}
      </button>
    </li>
  );
}
