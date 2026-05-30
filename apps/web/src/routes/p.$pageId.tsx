import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { PageEditor } from '../features/editor/editor.js';
import { EmojiPicker } from '../features/editor/emoji-picker.js';
import { uploadImage } from '../features/editor/image-upload.js';
import { useCollabDoc, type CollabStatus } from '../features/editor/use-collab-doc.js';
import { useSession } from '../lib/auth-client.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/p/$pageId')({
  component: PageView,
});

type PageProps = { title?: string; icon?: string; cover?: string };

function PageView() {
  const { pageId } = Route.useParams();
  const session = useSession();
  const token = session.data?.session.token;

  const pageQuery = useQuery({
    queryKey: ['block', 'getPage', pageId],
    queryFn: () => trpc.block.getPage.query({ pageId }),
  });

  if (pageQuery.isPending || session.isPending) {
    return <CenteredMessage>ページを読み込み中…</CenteredMessage>;
  }
  if (pageQuery.error) {
    return (
      <CenteredMessage>
        <p>ページの取得に失敗：{pageQuery.error.message}</p>
        <p className="mt-4">
          <BackLink />
        </p>
      </CenteredMessage>
    );
  }

  const { page } = pageQuery.data;
  const props = (page.props ?? {}) as PageProps;
  return (
    <PageShell
      pageId={page.id}
      workspaceId={page.workspaceId}
      initialTitle={props.title ?? '無題'}
      initialIcon={props.icon ?? ''}
      initialCover={props.cover ?? ''}
      token={token}
    />
  );
}

type ShellProps = {
  pageId: string;
  workspaceId: string;
  initialTitle: string;
  initialIcon: string;
  initialCover: string;
  token: string | undefined;
};

function PageShell({
  pageId,
  workspaceId,
  initialTitle,
  initialIcon,
  initialCover,
  token,
}: ShellProps) {
  const { doc, status } = useCollabDoc(`page:${pageId}`, token);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const deletePage = useMutation({
    mutationFn: () => trpc.block.deletePage.mutate({ pageId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['block', 'listAllPages'] });
      await queryClient.invalidateQueries({ queryKey: ['favorite'] });
      await navigate({ to: '/' });
    },
  });
  // このページをテンプレ化 (PBI-55)。本文 (Yjs state) ごと複製される。
  const saveAsTemplate = useMutation({
    mutationFn: () => trpc.block.saveAsTemplate.mutate({ pageId }),
    onSuccess: async () => {
      setTemplateSavedAt(new Date());
      await queryClient.invalidateQueries({ queryKey: ['block', 'listTemplates'] });
    },
  });
  const [title, setTitle] = useState(initialTitle);
  const [titleSavedAt, setTitleSavedAt] = useState<Date | null>(null);
  const [templateSavedAt, setTemplateSavedAt] = useState<Date | null>(null);
  const [icon, setIcon] = useState(initialIcon);
  const [cover, setCover] = useState(initialCover);
  const [pickerOpen, setPickerOpen] = useState(false);

  const setPageCover = useMutation({
    mutationFn: (next: string) => trpc.block.setPageCover.mutate({ pageId, cover: next }),
  });
  const pickCover = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      void uploadImage(file).then((url) => {
        if (url) {
          setCover(url);
          setPageCover.mutate(url);
        }
      });
    };
    input.click();
  };
  const removeCover = () => {
    setCover('');
    setPageCover.mutate('');
  };
  useEffect(() => setCover(initialCover), [initialCover]);

  const setPageIcon = useMutation({
    mutationFn: (next: string) => trpc.block.setPageIcon.mutate({ pageId, icon: next }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['block', 'listAllPages'] });
      void queryClient.invalidateQueries({ queryKey: ['favorite'] });
    },
  });

  const fav = useQuery({
    queryKey: ['favorite', 'isFavorite', pageId],
    queryFn: () => trpc.favorite.isFavorite.query({ pageId }),
  });
  const toggleFav = useMutation({
    mutationFn: () => trpc.favorite.toggle.mutate({ pageId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['favorite'] });
    },
  });

  useEffect(() => setIcon(initialIcon), [initialIcon]);

  // Title still lives in `block.props.title`; the editor body is owned by
  // Yjs. Persist title via the existing tRPC endpoint on blur.
  const updateTitle = useMutation({
    mutationFn: (newTitle: string) =>
      trpc.block.updatePageTitle.mutate({ pageId, title: newTitle }),
    onSuccess: () => {
      setTitleSavedAt(new Date());
      void queryClient.invalidateQueries({ queryKey: ['block', 'listPages'] });
    },
  });

  // Keep local title in sync if the server snapshot updates beneath us.
  useEffect(() => setTitle(initialTitle), [initialTitle]);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      {cover ? (
        <div className="group relative -mx-6 -mt-12 mb-6 h-40 overflow-hidden" data-testid="page-cover">
          <img src={cover} alt="" className="h-full w-full object-cover" />
          <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={pickCover}
              data-testid="page-cover-change"
              className="rounded bg-white/90 px-2 py-1 text-xs shadow hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-900"
            >
              変更
            </button>
            <button
              type="button"
              onClick={removeCover}
              data-testid="page-cover-remove"
              className="rounded bg-white/90 px-2 py-1 text-xs shadow hover:bg-white dark:bg-zinc-900/90 dark:hover:bg-zinc-900"
            >
              削除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={pickCover}
          data-testid="page-cover-add"
          className="mb-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          🖼️ カバー画像を追加
        </button>
      )}
      <Breadcrumb pageId={pageId} />
      <nav className="mb-6 flex items-center justify-between text-sm">
        <BackLink />
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => toggleFav.mutate()}
            disabled={toggleFav.isPending}
            data-testid="page-favorite-toggle"
            data-favorited={fav.data?.favorited ? 'true' : 'false'}
            aria-pressed={fav.data?.favorited ?? false}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            title={fav.data?.favorited ? 'お気に入りから外す' : 'お気に入りに追加'}
          >
            <span className={fav.data?.favorited ? 'text-amber-500' : ''}>
              {fav.data?.favorited ? '★' : '☆'}
            </span>
            <span className="text-xs">お気に入り</span>
          </button>
          <SharePopover pageId={pageId} />
          <button
            type="button"
            onClick={() => saveAsTemplate.mutate()}
            disabled={saveAsTemplate.isPending}
            data-testid="page-save-template"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
            title="テンプレートとして保存"
          >
            <span>📋</span>
            <span className="text-xs" data-testid="page-template-saved-label">
              {templateSavedAt ? 'テンプレートに保存しました' : 'テンプレートとして保存'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('このページ（とサブページ）をゴミ箱へ移動しますか？')) {
                deletePage.mutate();
              }
            }}
            disabled={deletePage.isPending}
            data-testid="page-delete"
            className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
            title="ゴミ箱へ移動"
          >
            <span>🗑️</span>
            <span className="text-xs">ゴミ箱</span>
          </button>
        </div>
      </nav>
      <div className="relative mb-2 flex items-start gap-2">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          data-testid="page-icon-button"
          aria-label="ページアイコン"
          className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-3xl hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          {icon || '📄'}
        </button>
        {pickerOpen ? (
          <EmojiPicker
            onPick={(e) => {
              setIcon(e);
              setPageIcon.mutate(e);
            }}
            onClose={() => setPickerOpen(false)}
          />
        ) : null}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            if (title.trim().length > 0 && title !== initialTitle) {
              updateTitle.mutate(title.trim());
            }
          }}
          data-testid="page-title-input"
          className="w-full bg-transparent text-3xl font-semibold tracking-tight focus:outline-none"
          placeholder="無題"
        />
      </div>
      <p className="mb-8 flex items-center gap-3 font-mono text-xs text-zinc-400">
        <span data-testid="page-id">{pageId}</span>
        <ConnectionBadge status={status} />
        {titleSavedAt ? (
          <span data-testid="title-saved" className="text-zinc-500">
            タイトル保存 {titleSavedAt.toLocaleTimeString('ja-JP')}
          </span>
        ) : null}
      </p>

      {doc ? (
        <PageEditor doc={doc} workspaceId={workspaceId} parentPageId={pageId} pageId={pageId} />
      ) : (
        <p className="text-zinc-500">エディタを準備中…</p>
      )}

      <ChildPagesSection pageId={pageId} />
      <BacklinksSection pageId={pageId} />
    </div>
  );
}

/**
 * ページ公開の設定ポップオーバー (PBI-56)。read-only 共有 URL の発行/停止と
 * URL コピー。外クリック / Esc で閉じる（EmojiPicker と同方式）。
 */
function SharePopover({ pageId }: { pageId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const share = useQuery({
    queryKey: ['block', 'getPublicShare', pageId],
    queryFn: () => trpc.block.getPublicShare.query({ pageId }),
    enabled: open,
  });
  const enable = useMutation({
    mutationFn: () => trpc.block.enablePublicShare.mutate({ pageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['block', 'getPublicShare', pageId] }),
  });
  const disable = useMutation({
    mutationFn: () => trpc.block.disablePublicShare.mutate({ pageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['block', 'getPublicShare', pageId] }),
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const enabled = share.data?.enabled ?? false;
  const token = share.data?.token ?? null;
  const url = token ? `${window.location.origin}/share/${token}` : '';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="page-share-button"
        className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="共有"
        aria-expanded={open}
      >
        <span>🔗</span>
        <span className="text-xs">共有</span>
      </button>
      {open ? (
        <div
          data-testid="share-popover"
          className="absolute right-0 top-full z-30 mt-1 w-72 rounded-md border border-zinc-200 bg-white p-3 text-left shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="mb-1 text-sm font-medium">公開 read-only リンク</p>
          <p className="mb-2 text-xs text-zinc-500">
            リンクを知っている人なら誰でも閲覧できます（編集不可・社内埋め込みは非表示）。
          </p>
          {share.isPending ? (
            <p className="text-xs text-zinc-500">読み込み中…</p>
          ) : enabled ? (
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <input
                  readOnly
                  value={url}
                  data-testid="share-url"
                  onFocus={(e) => e.currentTarget.select()}
                  className="min-w-0 flex-1 rounded border border-zinc-300 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                />
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(url);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1500);
                  }}
                  data-testid="share-copy"
                  className="shrink-0 rounded bg-violet-600 px-2 py-1 text-xs text-white hover:bg-violet-500"
                >
                  {copied ? '✓' : 'コピー'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => disable.mutate()}
                disabled={disable.isPending}
                data-testid="share-disable"
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                公開を停止
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => enable.mutate()}
              disabled={enable.isPending}
              data-testid="share-enable"
              className="w-full rounded-md bg-violet-600 px-3 py-1.5 text-sm text-white hover:bg-violet-500 disabled:opacity-50"
            >
              このページを公開する
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function BacklinksSection({ pageId }: { pageId: string }) {
  const backlinks = useQuery({
    queryKey: ['block', 'listBacklinks', pageId],
    queryFn: () => trpc.block.listBacklinks.query({ pageId }),
  });
  if (backlinks.isPending || !backlinks.data || backlinks.data.length === 0) return null;
  return (
    <section className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800" data-testid="backlinks-section">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-zinc-500">
        <span aria-hidden>🔗</span>
        バックリンク
        <span className="text-xs normal-case text-zinc-400">({backlinks.data.length})</span>
      </h2>
      <ul className="space-y-1">
        {backlinks.data.map((b) => (
          <li key={b.id}>
            <Link
              to="/p/$pageId"
              params={{ pageId: b.id }}
              data-testid={`backlink-${b.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <span aria-hidden>{b.icon || '📄'}</span>
              <span className="font-medium">{b.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChildPagesSection({ pageId }: { pageId: string }) {
  const children = useQuery({
    queryKey: ['block', 'listChildPages', pageId],
    queryFn: () => trpc.block.listChildPages.query({ parentPageId: pageId }),
  });
  if (children.isPending) return null;
  if (!children.data || children.data.length === 0) return null;
  return (
    <section className="mt-10" data-testid="child-pages-section">
      <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
        子ページ
      </h2>
      <ul className="space-y-1">
        {children.data.map((c) => {
          const title =
            (c.props as { title?: string } | null | undefined)?.title ?? '無題';
          return (
            <li key={c.id}>
              <Link
                to="/p/$pageId"
                params={{ pageId: c.id }}
                data-testid={`child-page-${c.id}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span aria-hidden>📄</span>
                <span className="font-medium">{title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
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

function Breadcrumb({ pageId }: { pageId: string }) {
  // 親ページのチェーン。/p/$pageId にいるときだけ表示する。
  const trail = useQuery({
    queryKey: ['block', 'getPageBreadcrumb', pageId],
    queryFn: () => trpc.block.getPageBreadcrumb.query({ pageId }),
  });
  if (trail.isPending || !trail.data || trail.data.length <= 1) return null;
  // 最後の要素 = 自分なので、それより前だけリンク
  const ancestors = trail.data.slice(0, -1);
  return (
    <nav
      aria-label="パンくず"
      data-testid="page-breadcrumb"
      className="mb-2 flex flex-wrap items-center gap-1 text-xs text-zinc-500"
    >
      {ancestors.map((a, i) => (
        <span key={a.id} className="flex items-center gap-1">
          {i > 0 ? <span aria-hidden>›</span> : null}
          <Link
            to="/p/$pageId"
            params={{ pageId: a.id }}
            data-testid={`breadcrumb-${a.id}`}
            className="rounded px-1 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            📄 {a.title}
          </Link>
        </span>
      ))}
      <span aria-hidden>›</span>
      <span className="text-zinc-400">現在のページ</span>
    </nav>
  );
}

function BackLink() {
  return (
    <Link to="/" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
      ← ワークスペースに戻る
    </Link>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center">
      <div>{children}</div>
    </div>
  );
}
