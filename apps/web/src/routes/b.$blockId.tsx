/**
 * 汎用 Block 詳細ルート `/b/$blockId`。
 *
 * Notion の「アイテム = ドキュメント」モデルを SYNAPSE でも踏襲し、
 * Project / Sprint / PBI / SBI どの種別でもこのルート 1 つで開く。
 *
 *   - 上段はメタ情報（ステータス / 優先度 / 期間 / 親リンク / 子件数）
 *   - 中段は Yjs/TipTap によるドキュメント本体
 *   - 下段は親子関係（PBI なら配下 SBI 一覧、Project / Sprint なら配下 PBI 一覧）
 *
 * いずれの Block も Yjs ドキュメントは `block:<id>` を name として
 * Hocuspocus に同居する。ページ用 `page:<id>` とは衝突しない。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import {
  PBI_STATUSES,
  PRIORITIES,
  PROJECT_STATUSES,
  SBI_STATUSES,
  SPRINT_STATUSES,
  type PbiStatus,
  type Priority,
  type ProjectStatus,
  type SbiStatus,
  type SprintStatus,
} from '@synapse/blocks';

import { PageEditor } from '../features/editor/editor.js';
import { useCollabDoc, type CollabStatus } from '../features/editor/use-collab-doc.js';
import { usePresence, type PresenceUser } from '../features/editor/use-presence.js';
import { useSession } from '../lib/auth-client.js';
import {
  blockHumanPrefix,
  blockTypeLabel,
  formatDate,
  pbiStatusLabel,
  priorityLabel,
  priorityTone,
  projectStatusLabel,
  sbiStatusLabel,
  sprintStatusLabel,
  statusTone,
} from '../lib/labels.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/b/$blockId')({
  component: BlockDetailRoute,
});

type BlockRow = Awaited<ReturnType<typeof trpc.block.getAny.query>>;

function BlockDetailRoute() {
  const { blockId } = Route.useParams();
  const session = useSession();
  const token = session.data?.session.token;

  const block = useQuery({
    queryKey: ['block', 'getAny', blockId],
    queryFn: () => trpc.block.getAny.query({ blockId }),
  });

  if (session.isPending || block.isPending) {
    return <Centered>読み込み中…</Centered>;
  }
  if (block.error) {
    return (
      <Centered>
        <p>ブロックの取得に失敗しました：{block.error.message}</p>
        <p className="mt-4">
          <Link to="/" className="text-violet-600 hover:underline">
            ← ワークスペースに戻る
          </Link>
        </p>
      </Centered>
    );
  }

  const self: PresenceUser | null = session.data
    ? {
        id: session.data.user.id,
        name: session.data.user.name ?? session.data.user.email,
        email: session.data.user.email,
        image: session.data.user.image ?? null,
      }
    : null;
  return <BlockShell block={block.data} token={token} self={self} />;
}

function BlockShell({
  block,
  token,
  self,
}: {
  block: BlockRow;
  token: string | undefined;
  self: PresenceUser | null;
}) {
  const docName = `block:${block.id}`;
  const { doc, provider, status } = useCollabDoc(docName, token);
  const peers = usePresence(provider, self);
  const props = (block.props ?? {}) as Record<string, unknown>;
  const number = typeof props['number'] === 'number' ? (props['number'] as number) : undefined;
  const prefix = blockHumanPrefix[block.type] ?? block.type.toUpperCase();
  const humanId = number ? `${prefix}-${number}` : block.id.slice(-6);
  const typeLabel = blockTypeLabel[block.type] ?? block.type;

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-12">
      <nav className="mb-6 text-sm text-zinc-500">
        <Link to="/" className="hover:underline">
          ← ワークスペースに戻る
        </Link>
        {' / '}
        <TypeIndexLink type={block.type} />
      </nav>

      <header className="mb-8 space-y-2">
        <div className="flex items-center gap-2 font-mono text-xs text-zinc-400">
          <span>{typeLabel}</span>
          <span>·</span>
          <span data-testid="block-human-id">{humanId}</span>
          <ConnectionBadge status={status} />
          <PresenceBar peers={peers} />
        </div>
        <BlockHeader block={block} />
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
          ドキュメント
        </h2>
        {doc ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <PageEditor doc={doc} workspaceId={block.workspaceId} />
          </div>
        ) : (
          <p className="text-zinc-500">エディタを準備中…</p>
        )}
      </section>

      <RelatedSection block={block} />
    </div>
  );
}

function TypeIndexLink({ type }: { type: string }) {
  switch (type) {
    case 'project':
      return (
        <Link to="/project" className="hover:underline">
          プロジェクト一覧
        </Link>
      );
    case 'sprint':
      return (
        <Link to="/sprint" className="hover:underline">
          スプリント一覧
        </Link>
      );
    case 'pbi':
      return (
        <Link to="/pbi" className="hover:underline">
          PBI 一覧
        </Link>
      );
    case 'sbi':
      return (
        <Link to="/sbi" className="hover:underline">
          SBI ボード
        </Link>
      );
    case 'page':
      return <span>ページ</span>;
    default:
      return <span>{type}</span>;
  }
}

// ── 種別別ヘッダー ─────────────────────────────────────────

function BlockHeader({ block }: { block: BlockRow }) {
  switch (block.type) {
    case 'project':
      return <ProjectHeader block={block} />;
    case 'sprint':
      return <SprintHeader block={block} />;
    case 'pbi':
      return <PbiHeader block={block} />;
    case 'sbi':
      return <SbiHeader block={block} />;
    default:
      return <FallbackHeader block={block} />;
  }
}

function ProjectHeader({ block }: { block: BlockRow }) {
  const qc = useQueryClient();
  const p = (block.props ?? {}) as {
    name?: string;
    status?: ProjectStatus;
    priority?: Priority;
    startDate?: string;
    plannedDate?: string;
    completedDate?: string;
  };
  const [name, setName] = useState(p.name ?? '無題');
  useEffect(() => setName(p.name ?? '無題'), [p.name]);

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      trpc.project.update.mutate({ projectId: block.id, patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['block', 'getAny', block.id] }),
  });

  return (
    <>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== p.name) update.mutate({ name: name.trim() });
        }}
        data-testid="project-name-input"
        className="w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
        placeholder="無題プロジェクト"
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusSelect
          value={p.status ?? 'backlog'}
          options={[...PROJECT_STATUSES]}
          label={projectStatusLabel}
          onChange={(v) => update.mutate({ status: v })}
        />
        <PrioritySelect
          value={p.priority ?? 'should'}
          onChange={(v) => update.mutate({ priority: v })}
        />
        <span className="text-xs text-zinc-500">
          開始 {formatDate(p.startDate)} → 予定 {formatDate(p.plannedDate)}
          {p.completedDate ? ` / 完了 ${formatDate(p.completedDate)}` : ''}
        </span>
      </div>
    </>
  );
}

function SprintHeader({ block }: { block: BlockRow }) {
  const qc = useQueryClient();
  const p = (block.props ?? {}) as {
    name?: string;
    status?: SprintStatus;
    startDate?: string;
    endDate?: string;
    goal?: string;
  };
  const [name, setName] = useState(p.name ?? '無題スプリント');
  useEffect(() => setName(p.name ?? '無題スプリント'), [p.name]);

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      trpc.sprint.update.mutate({ sprintId: block.id, patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['block', 'getAny', block.id] }),
  });

  return (
    <>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          if (name.trim() && name !== p.name) update.mutate({ name: name.trim() });
        }}
        data-testid="sprint-name-input"
        className="w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusSelect
          value={p.status ?? 'planning'}
          options={[...SPRINT_STATUSES]}
          label={sprintStatusLabel}
          onChange={(v) => update.mutate({ status: v })}
        />
        <span className="text-xs text-zinc-500">
          期間 {formatDate(p.startDate)} → {formatDate(p.endDate)}
        </span>
        {p.goal ? <span className="text-xs text-zinc-500">ゴール：{p.goal}</span> : null}
      </div>
    </>
  );
}

function PbiHeader({ block }: { block: BlockRow }) {
  const qc = useQueryClient();
  const p = (block.props ?? {}) as {
    title?: string;
    status?: PbiStatus;
    priority?: Priority;
    estimate?: number;
    storyPoints?: number;
    projectId?: string;
    sprintId?: string;
    assigneeIds?: string[];
  };
  const [title, setTitle] = useState(p.title ?? '無題 PBI');
  useEffect(() => setTitle(p.title ?? '無題 PBI'), [p.title]);

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      trpc.pbi.update.mutate({ pbiId: block.id, patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['block', 'getAny', block.id] }),
  });

  return (
    <>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title.trim() && title !== p.title) update.mutate({ title: title.trim() });
        }}
        data-testid="pbi-title-input"
        className="w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusSelect
          value={p.status ?? 'backlog'}
          options={[...PBI_STATUSES]}
          label={pbiStatusLabel}
          onChange={(v) => update.mutate({ status: v })}
        />
        <PrioritySelect
          value={p.priority ?? 'should'}
          onChange={(v) => update.mutate({ priority: v })}
        />
        {typeof p.estimate === 'number' ? (
          <span className="font-mono text-xs text-zinc-500">見積 {p.estimate}sp</span>
        ) : null}
        <AssigneePicker
          workspaceId={block.workspaceId}
          selected={p.assigneeIds ?? []}
          onChange={(ids) => update.mutate({ assigneeIds: ids })}
        />
        {p.projectId ? <ParentLink type="project" id={p.projectId} /> : null}
        {p.sprintId ? <ParentLink type="sprint" id={p.sprintId} /> : null}
      </div>
    </>
  );
}

function SbiHeader({ block }: { block: BlockRow }) {
  const qc = useQueryClient();
  const p = (block.props ?? {}) as {
    title?: string;
    status?: SbiStatus;
    estimateHours?: number;
    actualHours?: number;
    pbiId?: string;
    assigneeId?: string;
  };
  const [title, setTitle] = useState(p.title ?? '無題 SBI');
  useEffect(() => setTitle(p.title ?? '無題 SBI'), [p.title]);

  const update = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      trpc.sbi.update.mutate({ sbiId: block.id, patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['block', 'getAny', block.id] }),
  });

  return (
    <>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => {
          if (title.trim() && title !== p.title) update.mutate({ title: title.trim() });
        }}
        data-testid="sbi-title-input"
        className="w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-2">
        <StatusSelect
          value={p.status ?? 'todo'}
          options={[...SBI_STATUSES]}
          label={sbiStatusLabel}
          onChange={(v) => update.mutate({ status: v })}
        />
        {typeof p.estimateHours === 'number' ? (
          <span className="font-mono text-xs text-zinc-500">見積 {p.estimateHours}h</span>
        ) : null}
        {typeof p.actualHours === 'number' ? (
          <span className="font-mono text-xs text-zinc-500">実績 {p.actualHours}h</span>
        ) : null}
        <AssigneePicker
          workspaceId={block.workspaceId}
          selected={p.assigneeId ? [p.assigneeId] : []}
          single
          onChange={(ids) => update.mutate({ assigneeId: ids[0] ?? undefined })}
        />
        {p.pbiId ? <ParentLink type="pbi" id={p.pbiId} /> : null}
      </div>
    </>
  );
}

function FallbackHeader({ block }: { block: BlockRow }) {
  const title =
    typeof (block.props as { title?: string } | null)?.title === 'string'
      ? (block.props as { title?: string }).title
      : block.type;
  return <h1 className="text-3xl font-semibold tracking-tight">{title ?? '(無題)'}</h1>;
}

// ── 子関係セクション ────────────────────────────────────────

function RelatedSection({ block }: { block: BlockRow }) {
  if (block.type === 'project') return <ProjectChildren projectId={block.id} />;
  if (block.type === 'sprint') return <SprintChildren sprintId={block.id} />;
  if (block.type === 'pbi') return <PbiChildren pbiId={block.id} workspaceId={block.workspaceId} />;
  return null;
}

function ProjectChildren({ projectId }: { projectId: string }) {
  const list = useQuery({
    queryKey: ['pbi', 'listForProject', projectId],
    queryFn: () => trpc.pbi.listForProject.query({ projectId }),
  });
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">配下の PBI</h2>
      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : list.data && list.data.length > 0 ? (
        <ChildList items={list.data} kind="pbi" />
      ) : (
        <EmptyHint>
          このプロジェクトに紐付く PBI はまだありません。
          <Link to="/pbi" className="ml-1 text-violet-600 hover:underline">
            PBI を作る →
          </Link>
        </EmptyHint>
      )}
    </section>
  );
}

function SprintChildren({ sprintId }: { sprintId: string }) {
  const list = useQuery({
    queryKey: ['pbi', 'listForSprint', sprintId],
    queryFn: () => trpc.pbi.listForSprint.query({ sprintId }),
  });
  return (
    <section>
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        このスプリントの PBI
      </h2>
      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : list.data && list.data.length > 0 ? (
        <ChildList items={list.data} kind="pbi" />
      ) : (
        <EmptyHint>このスプリントに割り当てられた PBI はまだありません。</EmptyHint>
      )}
    </section>
  );
}

function PbiChildren({ pbiId, workspaceId }: { pbiId: string; workspaceId: string }) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['sbi', 'listForPbi', pbiId],
    queryFn: () => trpc.sbi.listForPbi.query({ pbiId }),
  });
  const [title, setTitle] = useState('');
  const create = useMutation({
    mutationFn: (newTitle: string) => trpc.sbi.create.mutate({ pbiId, title: newTitle }),
    onSuccess: async () => {
      setTitle('');
      await qc.invalidateQueries({ queryKey: ['sbi', 'listForPbi', pbiId] });
      await qc.invalidateQueries({ queryKey: ['sbi', 'listForWorkspace', workspaceId] });
    },
  });

  return (
    <section>
      <header className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">配下の SBI</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            create.mutate(title.trim());
          }}
          className="flex items-center gap-2"
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="新しい SBI のタイトル"
            data-testid="new-sbi-title"
            className="w-56 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={create.isPending || !title.trim()}
            data-testid="create-sbi-submit"
            className="rounded-md bg-violet-600 px-3 py-1 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-60"
          >
            追加
          </button>
        </form>
      </header>
      {list.isPending ? (
        <p className="text-sm text-zinc-500">読み込み中…</p>
      ) : list.data && list.data.length > 0 ? (
        <ChildList items={list.data} kind="sbi" />
      ) : (
        <EmptyHint>SBI を追加すると、ここに並んでいきます。</EmptyHint>
      )}
    </section>
  );
}

type ChildKind = 'pbi' | 'sbi';

function ChildList({ items, kind }: { items: BlockRow[]; kind: ChildKind }) {
  return (
    <ul
      data-testid={`child-${kind}-list`}
      className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
    >
      {items.map((row) => {
        const p = (row.props ?? {}) as {
          title?: string;
          status?: string;
          number?: number;
        };
        const prefix = kind === 'pbi' ? 'PBI' : 'SBI';
        const label = `${prefix}-${p.number ?? '–'}`;
        const statusJp =
          kind === 'pbi'
            ? pbiStatusLabel[(p.status ?? 'backlog') as PbiStatus]
            : sbiStatusLabel[(p.status ?? 'todo') as SbiStatus];
        return (
          <li
            key={row.id}
            data-testid={`child-row-${row.id}`}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="font-mono text-xs text-zinc-400">{label}</span>
              <Link
                to="/b/$blockId"
                params={{ blockId: row.id }}
                className="truncate text-sm font-medium hover:underline"
              >
                {p.title ?? '(無題)'}
              </Link>
            </div>
            <span
              className={`rounded px-1.5 py-0.5 font-mono text-xs ${
                statusTone[p.status ?? 'backlog'] ?? statusTone['backlog']
              }`}
            >
              {statusJp}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// ── 共通子コンポーネント ─────────────────────────────────────

// ── アサイン者 ───────────────────────────────────────────

type Member = Awaited<ReturnType<typeof trpc.workspace.listMembers.query>>[number];

function AssigneePicker({
  workspaceId,
  selected,
  single,
  onChange,
}: {
  workspaceId: string;
  selected: string[];
  /** 単一選択にする（SBI 用）。省略時は複数選択（PBI 用）。 */
  single?: boolean;
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const members = useQuery({
    queryKey: ['workspace', 'listMembers', workspaceId],
    queryFn: () => trpc.workspace.listMembers.query({ workspaceId }),
  });
  const byId = new Map<string, Member>();
  for (const m of members.data ?? []) byId.set(m.userId, m);

  const toggle = (userId: string) => {
    if (single) {
      onChange(selected.includes(userId) ? [] : [userId]);
      setOpen(false);
      return;
    }
    const next = selected.includes(userId)
      ? selected.filter((x) => x !== userId)
      : [...selected, userId];
    onChange(next);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="assignee-picker"
        className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        <span className="text-zinc-500">担当</span>
        {selected.length === 0 ? (
          <span className="text-zinc-400">未割当</span>
        ) : (
          <span className="flex -space-x-1.5">
            {selected.slice(0, 3).map((id) => {
              const m = byId.get(id);
              return (
                <MemberAvatar
                  key={id}
                  name={m?.name ?? m?.email ?? '?'}
                  image={m?.image ?? null}
                  size={20}
                />
              );
            })}
            {selected.length > 3 ? (
              <span className="ml-1 text-[10px] text-zinc-500">+{selected.length - 3}</span>
            ) : null}
          </span>
        )}
      </button>
      {open ? (
        <div className="absolute left-0 z-10 mt-1 w-56 rounded-md border border-zinc-200 bg-white p-1 shadow-md dark:border-zinc-700 dark:bg-zinc-900">
          {(members.data ?? []).map((m) => {
            const active = selected.includes(m.userId);
            return (
              <button
                key={m.userId}
                type="button"
                onClick={() => toggle(m.userId)}
                data-testid={`assignee-option-${m.userId}`}
                className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm ${
                  active
                    ? 'bg-violet-100 text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                <MemberAvatar name={m.name ?? m.email} image={m.image ?? null} size={20} />
                <span className="min-w-0 flex-1 truncate">{m.name ?? m.email}</span>
                {active ? <span className="text-xs">✓</span> : null}
              </button>
            );
          })}
          {selected.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
              className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              全員解除
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MemberAvatar({
  name,
  image,
  size = 24,
}: {
  name: string;
  image: string | null;
  size?: number;
}) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.45) };
  if (image) {
    return (
      <img
        src={image}
        alt={name}
        style={style}
        className="inline-block rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
      />
    );
  }
  const initial = name.trim().slice(0, 1).toUpperCase() || '?';
  return (
    <span
      style={style}
      className="inline-flex items-center justify-center rounded-full bg-violet-100 font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200"
    >
      {initial}
    </span>
  );
}

function ParentLink({ type, id }: { type: 'project' | 'sprint' | 'pbi'; id: string }) {
  const q = useQuery({
    queryKey: ['block', 'getAny', id],
    queryFn: () => trpc.block.getAny.query({ blockId: id }),
  });
  const props = (q.data?.props ?? {}) as { name?: string; title?: string; number?: number };
  const prefix = blockHumanPrefix[type] ?? type.toUpperCase();
  const label = `${prefix}-${props.number ?? '?'}`;
  const name = props.name ?? props.title ?? '';
  return (
    <Link
      to="/b/$blockId"
      params={{ blockId: id }}
      data-testid={`parent-${type}-${id}`}
      className="inline-flex items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 py-0.5 font-mono text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
    >
      <span className="text-zinc-500">{blockTypeLabel[type] ?? type}</span>
      <span>{label}</span>
      {name ? (
        <span className="ml-1 max-w-[8rem] truncate text-zinc-700 dark:text-zinc-300">{name}</span>
      ) : null}
    </Link>
  );
}

function StatusSelect<T extends string>({
  value,
  options,
  label,
  onChange,
}: {
  value: T;
  options: T[];
  label: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      data-testid="status-select"
      className={`rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 ${
        statusTone[value] ?? ''
      }`}
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {label[o]}
        </option>
      ))}
    </select>
  );
}

function PrioritySelect({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Priority)}
      data-testid="priority-select"
      className={`rounded-md border border-zinc-300 px-2 py-1 font-mono text-xs dark:border-zinc-700 ${
        priorityTone[value]
      }`}
    >
      {PRIORITIES.map((o) => (
        <option key={o} value={o}>
          優先：{priorityLabel[o]}
        </option>
      ))}
    </select>
  );
}

function PresenceBar({ peers }: { peers: PresenceUser[] }) {
  if (peers.length === 0) return null;
  return (
    <span
      data-testid="presence-bar"
      data-peer-count={peers.length}
      className="ml-2 inline-flex items-center gap-1"
    >
      <span className="text-zinc-400">同時編集</span>
      <span className="flex -space-x-1.5">
        {peers.slice(0, 5).map((u) => {
          const initial = u.name.trim().slice(0, 1).toUpperCase() || '?';
          const style = { background: u.color ?? '#8b5cf6' };
          return u.image ? (
            <img
              key={u.id}
              src={u.image}
              alt={u.name}
              title={u.name}
              style={{ outlineColor: u.color ?? '#8b5cf6' }}
              className="inline-block h-5 w-5 rounded-full object-cover outline outline-2 outline-offset-1"
            />
          ) : (
            <span
              key={u.id}
              title={u.name}
              style={style}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium text-white"
            >
              {initial}
            </span>
          );
        })}
        {peers.length > 5 ? (
          <span className="ml-1 text-[10px] text-zinc-500">+{peers.length - 5}</span>
        ) : null}
      </span>
    </span>
  );
}

function ConnectionBadge({ status }: { status: CollabStatus }) {
  const label =
    status === 'connected'
      ? '同期中'
      : status === 'connecting'
        ? '接続中…'
        : status === 'offline'
          ? 'オフライン'
          : '切断';
  const tone =
    status === 'connected'
      ? 'bg-emerald-500'
      : status === 'connecting'
        ? 'bg-amber-500'
        : 'bg-zinc-400';
  return (
    <span
      data-testid="connection-status"
      data-status={status}
      className="inline-flex items-center gap-1.5"
    >
      <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />
      {label}
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

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center p-6 text-center">{children}</div>;
}
