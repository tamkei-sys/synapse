/**
 * 公開共有ページ (PBI-56) — 認証不要の read-only ビュー。
 *
 * /share/<token> で getPublicPage(publicProcedure) を叩き、サニタイズ済みの
 * doc を表示する。__root はこのパスのとき chrome（サイドバー / コマンド
 * パレット / topbar）を出さないので、顧客にはクリーンな1枚ページだけが見える。
 * 無効なトークン・公開停止中は「見つかりません」を出す。
 */
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

import { PublicPageEditor } from '../features/editor/public-page-editor.js';
import { trpc } from '../lib/trpc.js';

export const Route = createFileRoute('/share/$token')({
  component: PublicShareView,
});

function PublicShareView() {
  const { token } = Route.useParams();
  const pageQuery = useQuery({
    queryKey: ['block', 'getPublicPage', token],
    queryFn: () => trpc.block.getPublicPage.query({ token }),
    retry: false,
  });

  if (pageQuery.isPending) {
    return <CenteredMessage>読み込み中…</CenteredMessage>;
  }
  if (pageQuery.error || !pageQuery.data) {
    return (
      <CenteredMessage>
        <p className="text-lg font-medium" data-testid="public-not-found">
          ページが見つかりません
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          この共有リンクは無効か、公開が停止されています。
        </p>
      </CenteredMessage>
    );
  }

  const { title, icon, cover, doc } = pageQuery.data;
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12">
      {cover ? (
        <div className="-mx-6 -mt-12 mb-6 h-40 overflow-hidden" data-testid="public-cover">
          <img src={cover} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <div className="mb-8 flex items-start gap-2">
        <span className="mt-1 shrink-0 text-3xl" aria-hidden>
          {icon || '📄'}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight" data-testid="public-title">
          {title}
        </h1>
      </div>
      <PublicPageEditor doc={doc} />
      <footer className="mt-16 border-t border-zinc-200 pt-4 text-xs text-zinc-400 dark:border-zinc-800">
        SYNAPSE で作成された公開ページ
      </footer>
    </div>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>{children}</div>
    </div>
  );
}
