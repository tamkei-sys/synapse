/**
 * メンバーと招待の管理。
 *
 * - 上段：メンバー一覧（自分を含む）。role 変更と除名が owner/admin に
 *   許可される。最後の owner は降格・除名できない（API 側で防御済み）。
 * - 中段：未受諾の招待一覧（取り消し可）。受諾済み・取り消し済みは下に折りたたみ。
 * - 下段：新規招待フォーム。発行直後だけ平文トークン付きの共有 URL を表示。
 *
 * 招待リンクは `${origin}/invite/<token>` 形式。共有された人が
 * ログイン → ボタン押下で workspace に参加。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useSession } from '../lib/auth-client.js';
import { useCurrentWorkspaceFromList, useStoredWorkspaceId } from '../lib/current-workspace.js';
import { formatDate, formatDateTime } from '../lib/labels.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/settings/members')({
  component: MembersRoute,
});

type Role = 'owner' | 'admin' | 'member' | 'viewer';
const ROLE_LABEL: Record<Role, string> = {
  owner: 'オーナー',
  admin: '管理者',
  member: 'メンバー',
  viewer: '閲覧者',
};
const ROLE_TONE: Record<Role, string> = {
  owner: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  admin: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  member: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  viewer: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

function MembersRoute() {
  const session = useSession();
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
    enabled: !!session.data,
  });
  if (session.isPending || workspaces.isPending) return <Centered>読み込み中…</Centered>;
  if (!session.data) {
    return (
      <Centered>
        <Link to="/login" className="text-violet-600 hover:underline">
          ログイン
        </Link>
      </Centered>
    );
  }
  const workspace = useCurrentWorkspaceFromList(workspaces.data);
  if (!workspace) {
    return (
      <Centered>
        <Link to="/" className="text-violet-600 hover:underline">
          まずはワークスペースを作成
        </Link>
      </Centered>
    );
  }
  return (
    <MembersPanel
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      selfUserId={session.data.user.id}
    />
  );
}

function MembersPanel({
  workspaceId,
  workspaceName,
  selfUserId,
}: {
  workspaceId: string;
  workspaceName: string;
  selfUserId: string;
}) {
  const qc = useQueryClient();
  const members = useQuery({
    queryKey: ['workspace', 'listMembers', workspaceId],
    queryFn: () => trpc.workspace.listMembers.query({ workspaceId }),
  });
  const invitations = useQuery({
    queryKey: ['workspace', 'listInvitations', workspaceId],
    queryFn: () => trpc.workspace.listInvitations.query({ workspaceId }),
  });

  const self = members.data?.find((m) => m.userId === selfUserId);
  const selfRole = (self?.role ?? 'member') as Role;
  const canAdmin = selfRole === 'owner' || selfRole === 'admin';

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">メンバー · {workspaceName}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            <Link to="/" className="hover:underline">
              ← ワークスペースに戻る
            </Link>
            {' · '}
            あなたの役割：
            <span className={`ml-1 rounded px-1.5 font-mono text-xs ${ROLE_TONE[selfRole]}`}>
              {ROLE_LABEL[selfRole]}
            </span>
          </p>
        </div>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          参加メンバー
        </h2>
        {members.isPending ? (
          <p className="text-sm text-zinc-500">読み込み中…</p>
        ) : members.data && members.data.length > 0 ? (
          <ul
            data-testid="members-list"
            className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
          >
            {members.data.map((m) => (
              <MemberRow
                key={m.userId}
                workspaceId={workspaceId}
                member={m}
                selfUserId={selfUserId}
                canAdmin={canAdmin}
                onChange={async () => {
                  await qc.invalidateQueries({
                    queryKey: ['workspace', 'listMembers', workspaceId],
                  });
                }}
              />
            ))}
          </ul>
        ) : (
          <EmptyHint>誰も所属していません（読み込みエラーの可能性）。</EmptyHint>
        )}
      </section>

      {canAdmin ? (
        <>
          <section className="mb-10">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              新規招待
            </h2>
            <InviteForm workspaceId={workspaceId} />
          </section>

          <section className="mb-10">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              招待履歴
            </h2>
            {invitations.isPending ? (
              <p className="text-sm text-zinc-500">読み込み中…</p>
            ) : invitations.data && invitations.data.length > 0 ? (
              <InvitationsList workspaceId={workspaceId} rows={invitations.data} />
            ) : (
              <EmptyHint>まだ招待は出していません。</EmptyHint>
            )}
          </section>
        </>
      ) : (
        <EmptyHint>
          メンバーを招待・管理する権限がありません（オーナーまたは管理者のみ）。
        </EmptyHint>
      )}

      {selfRole === 'owner' ? (
        <DangerZone workspaceId={workspaceId} workspaceName={workspaceName} />
      ) : null}
    </div>
  );
}

type MemberRowProps = {
  workspaceId: string;
  member: Awaited<ReturnType<typeof trpc.workspace.listMembers.query>>[number];
  selfUserId: string;
  canAdmin: boolean;
  onChange: () => Promise<void>;
};

function MemberRow({ workspaceId, member, selfUserId, canAdmin, onChange }: MemberRowProps) {
  const setRole = useMutation({
    mutationFn: (role: Role) =>
      trpc.workspace.setMemberRole.mutate({
        workspaceId,
        userId: member.userId,
        role,
      }),
    onSuccess: () => onChange(),
  });
  const remove = useMutation({
    mutationFn: () => trpc.workspace.removeMember.mutate({ workspaceId, userId: member.userId }),
    onSuccess: () => onChange(),
  });

  const isSelf = member.userId === selfUserId;
  const role = (member.role ?? 'member') as Role;

  return (
    <li
      data-testid={`member-row-${member.userId}`}
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <Avatar name={member.name ?? member.email} image={member.image ?? null} />
        <div>
          <p className="text-sm font-medium">
            {member.name ?? '(名前未設定)'}
            {isSelf ? <span className="ml-2 text-xs text-zinc-500">あなた</span> : null}
          </p>
          <p className="text-xs text-zinc-500">{member.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canAdmin && !isSelf ? (
          <select
            value={role}
            onChange={(e) => setRole.mutate(e.target.value as Role)}
            disabled={setRole.isPending}
            data-testid={`member-role-${member.userId}`}
            className={`rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 ${ROLE_TONE[role]}`}
          >
            <option value="owner">{ROLE_LABEL.owner}</option>
            <option value="admin">{ROLE_LABEL.admin}</option>
            <option value="member">{ROLE_LABEL.member}</option>
            <option value="viewer">{ROLE_LABEL.viewer}</option>
          </select>
        ) : (
          <span className={`rounded px-1.5 font-mono text-xs ${ROLE_TONE[role]}`}>
            {ROLE_LABEL[role]}
          </span>
        )}
        <span className="text-xs text-zinc-500">
          参加 {formatDate(member.joinedAt.toISOString())}
        </span>
        {canAdmin && !isSelf ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`${member.name ?? member.email} を除名しますか？`)) {
                remove.mutate();
              }
            }}
            disabled={remove.isPending}
            data-testid={`member-remove-${member.userId}`}
            className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:border-red-700/60 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            除名
          </button>
        ) : null}
      </div>
    </li>
  );
}

function InviteForm({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [issued, setIssued] = useState<{ token: string; email: string; expiresAt: Date } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: () =>
      trpc.workspace.invite.mutate({
        workspaceId,
        email: email.trim(),
        role: role as Exclude<Role, 'owner'>,
      }),
    onSuccess: async (row) => {
      setIssued({ token: row.token, email: row.email, expiresAt: row.expiresAt });
      setEmail('');
      setError(null);
      await qc.invalidateQueries({ queryKey: ['workspace', 'listInvitations', workspaceId] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const inviteUrl =
    issued && typeof window !== 'undefined'
      ? `${window.location.origin}/invite/${issued.token}`
      : '';

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email.trim()) return;
          invite.mutate();
        }}
        data-testid="invite-form"
        className="flex flex-wrap items-end gap-2"
      >
        <label className="flex-1">
          <span className="mb-1 block text-xs text-zinc-500">招待する人のメール</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com"
            data-testid="invite-email"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-zinc-500">役割</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            data-testid="invite-role"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="admin">{ROLE_LABEL.admin}</option>
            <option value="member">{ROLE_LABEL.member}</option>
            <option value="viewer">{ROLE_LABEL.viewer}</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={invite.isPending || !email.trim()}
          data-testid="invite-submit"
          className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {invite.isPending ? '発行中…' : '招待リンクを発行'}
        </button>
      </form>
      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {issued ? (
        <div
          data-testid="issued-invite"
          className="mt-4 rounded-md border border-violet-300 bg-violet-50 p-3 text-sm dark:border-violet-700/60 dark:bg-violet-950/40"
        >
          <p className="mb-1 font-medium">
            {issued.email} 宛の招待リンクを発行しました（有効期限{' '}
            {formatDate(issued.expiresAt.toISOString())}）
          </p>
          <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">
            このリンクを共有してください。閉じると同じリンクは二度と表示できません。
          </p>
          <code
            data-testid="issued-invite-url"
            className="block break-all rounded bg-white px-3 py-2 font-mono text-xs dark:bg-zinc-900"
          >
            {inviteUrl}
          </code>
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(inviteUrl)}
              className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              クリップボードにコピー
            </button>
            <button
              type="button"
              onClick={() => setIssued(null)}
              className="text-xs text-zinc-500 hover:underline"
            >
              閉じる
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InvitationsList({
  workspaceId,
  rows,
}: {
  workspaceId: string;
  rows: Awaited<ReturnType<typeof trpc.workspace.listInvitations.query>>;
}) {
  const qc = useQueryClient();
  const cancel = useMutation({
    mutationFn: (invitationId: string) => trpc.workspace.cancelInvitation.mutate({ invitationId }),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['workspace', 'listInvitations', workspaceId] }),
  });

  return (
    <ul
      data-testid="invitations-list"
      className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
    >
      {rows.map((inv) => {
        const state = inv.acceptedAt
          ? 'accepted'
          : inv.revokedAt
            ? 'revoked'
            : inv.expiresAt.getTime() < Date.now()
              ? 'expired'
              : 'pending';
        const stateLabel: Record<typeof state, string> = {
          accepted: '受諾済み',
          revoked: '取消済み',
          expired: '期限切れ',
          pending: '受諾待ち',
        };
        const stateTone: Record<typeof state, string> = {
          accepted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
          revoked: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
          expired: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
          pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        };
        return (
          <li
            key={inv.id}
            data-testid={`invitation-row-${inv.id}`}
            data-state={state}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{inv.email}</p>
              <p className="text-xs text-zinc-500">
                発行 {formatDateTime(inv.createdAt)} · 有効期限{' '}
                {formatDate(inv.expiresAt.toISOString())}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded px-1.5 font-mono text-xs ${ROLE_TONE[inv.role as Role]}`}>
                {ROLE_LABEL[inv.role as Role]}
              </span>
              <span className={`rounded px-1.5 font-mono text-xs ${stateTone[state]}`}>
                {stateLabel[state]}
              </span>
              {state === 'pending' ? (
                <button
                  type="button"
                  onClick={() => cancel.mutate(inv.id)}
                  disabled={cancel.isPending}
                  data-testid={`invitation-cancel-${inv.id}`}
                  className="rounded-md border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  取り消し
                </button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        className="h-8 w-8 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
      />
    );
  }
  const initial = name.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-sm font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
      {initial}
    </span>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
      {children}
    </div>
  );
}

function DangerZone({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [, setStoredId] = useStoredWorkspaceId();
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: () =>
      trpc.workspace.delete.mutate({ workspaceId, confirmName: confirmName.trim() }),
    onSuccess: async () => {
      setStoredId(null);
      // 削除後はあらゆる workspace 由来クエリを wipe して / に戻す。
      qc.clear();
      await navigate({ to: '/' });
    },
    onError: (e: Error) => setError(e.message),
  });

  const matches = confirmName.trim() === workspaceName;

  return (
    <section className="mt-10 rounded-lg border border-red-300 bg-red-50/50 p-4 dark:border-red-700/60 dark:bg-red-950/30">
      <h2 className="mb-1 text-sm font-medium uppercase tracking-wide text-red-700 dark:text-red-300">
        危険ゾーン
      </h2>
      <p className="mb-3 text-sm text-red-700 dark:text-red-300">
        ワークスペースを削除すると、紐づくすべてのページ・PBI・SBI・コメント・通知・トークン・監査ログが復元不可能に消えます。
      </p>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="open-delete-workspace"
          className="rounded-md border border-red-400 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-600 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          ワークスペースを削除…
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-red-700 dark:text-red-300">
            確認のため、ワークスペース名 <code className="font-mono">{workspaceName}</code>{' '}
            をそのまま入力してください。
          </p>
          <input
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={workspaceName}
            data-testid="delete-workspace-confirm-name"
            className="w-full rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm dark:border-red-700 dark:bg-zinc-950"
          />
          {error ? <p className="text-xs text-red-700 dark:text-red-300">{error}</p> : null}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setError(null);
                remove.mutate();
              }}
              disabled={!matches || remove.isPending}
              data-testid="delete-workspace-submit"
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
            >
              {remove.isPending ? '削除中…' : '完全に削除する'}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmName('');
                setError(null);
              }}
              className="text-xs text-zinc-500 hover:underline"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
