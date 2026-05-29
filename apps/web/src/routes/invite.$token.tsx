/**
 * 招待リンク受諾画面 `/invite/$token`。
 *
 * - 未ログインなら `/login?redirect=...` に飛ばす。
 * - ログイン済みなら招待のプレビューを表示し、ボタンで受諾。
 *   受諾後はワークスペースのトップへ。
 *
 * トークン自体は URL に乗るので、HTTPS 前提＆短期失効＆ワンタイム
 * （受諾済みは弾く）で運用する。共有先がそのまま他人に再送するリスクは
 * 既知（ヒューマンなチェック）。
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useSession } from '../lib/auth-client.js';
import { formatDate } from '../lib/labels.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/invite/$token')({
  component: InviteAcceptRoute,
});

const ROLE_LABEL: Record<string, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
  viewer: '閲覧者',
};

function InviteAcceptRoute() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const session = useSession();

  // 未ログインなら /login へ。戻り先は invite ページに固定。
  useEffect(() => {
    if (!session.isPending && !session.data) {
      void navigate({ to: '/login', search: { redirect: `/invite/${token}` } });
    }
  }, [session.data, session.isPending, navigate, token]);

  const preview = useQuery({
    queryKey: ['workspace', 'previewInvitation', token],
    queryFn: () => trpc.workspace.previewInvitation.query({ token }),
    enabled: !!session.data,
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () => trpc.workspace.acceptInvitation.mutate({ token }),
    onSuccess: async () => {
      await navigate({ to: '/' });
    },
  });

  if (session.isPending) {
    return <Shell title="読み込み中…">ログイン状態を確認しています。</Shell>;
  }
  if (!session.data) {
    return <Shell title="ログインが必要">ログイン画面に移動しています…</Shell>;
  }
  if (preview.isPending) {
    return <Shell title="招待を確認中…">招待リンクを照会しています。</Shell>;
  }
  if (preview.error) {
    return (
      <Shell title="招待リンクが無効">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{preview.error.message}</p>
        <p className="mt-4">
          <Link to="/" className="text-violet-600 hover:underline">
            ← ワークスペースに戻る
          </Link>
        </p>
      </Shell>
    );
  }

  const inv = preview.data;

  if (!inv.usable) {
    const why = inv.acceptedAt
      ? '既に受諾されています。'
      : inv.revokedAt
        ? '取り消されました。'
        : '有効期限が切れています。';
    return (
      <Shell title="このリンクは使えません">
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{why}</p>
        <p className="mt-4">
          <Link to="/" className="text-violet-600 hover:underline">
            ← ワークスペースに戻る
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell title={`${inv.workspaceName} に参加`}>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">
        役割：
        <span className="ml-1 rounded bg-violet-100 px-1.5 font-mono text-xs text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
          {ROLE_LABEL[inv.role] ?? inv.role}
        </span>{' '}
        · 有効期限 {formatDate(inv.expiresAt.toISOString())}
      </p>
      {accept.error ? (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{accept.error.message}</p>
      ) : null}
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => accept.mutate()}
          disabled={accept.isPending}
          data-testid="invite-accept"
          className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {accept.isPending ? '参加中…' : '参加する'}
        </button>
        <Link to="/" className="text-sm text-zinc-500 hover:underline">
          後で
        </Link>
      </div>
    </Shell>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="mb-4 text-xl font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </div>
  );
}
