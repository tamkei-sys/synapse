/**
 * /help — 使い方マニュアル (PBI-93)。
 *
 * 全ワークスペースで常設の静的オンボーディング。新規 WS でも最初から
 * サイドバーの「📖 使い方」から開けるので、空の状態で迷わない。Yjs / DB に
 * 依存しない純粋な静的ページ（編集・複製はしない、読むためのもの）。
 */
import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/help')({
  component: HelpPage,
});

type Section = {
  icon: string;
  title: string;
  body: string;
  steps?: string[];
};

const SECTIONS: readonly Section[] = [
  {
    icon: '🚀',
    title: 'はじめに',
    body: 'SYNAPSE は、ドキュメント・タスク管理 (PBI/スプリント)・スプレッドシートを 1 つにまとめたブロックベースのワークスペースです。左のサイドバーから各機能に移動できます。',
  },
  {
    icon: '📄',
    title: 'ページとドキュメント',
    body: 'サイドバーの「ページ」セクションの ＋ で新規ページを作成します。本文はリアルタイムに自動保存され、複数人で同時編集できます。',
    steps: [
      '「/」を入力するとスラッシュメニューが開き、見出し・リスト・表・コードブロック・カラム・画像・ファイル・ブックマーク・数式などを挿入できます',
      '「@」でほかのページへのリンク（メンション）を挿入できます。参照は被リンク先の「バックリンク」に自動で並びます',
      'ページ右上から、テンプレート保存・公開共有リンク・履歴(版の保存と復元)・リマインダー・ゴミ箱が使えます',
      'ページ内に子ページを作ると、ツリーで階層管理できます',
    ],
  },
  {
    icon: '✅',
    title: 'PBI・スプリント・プロジェクト',
    body: 'プロダクトバックログ項目 (PBI) をプロジェクト／スプリントに紐付けて管理します。',
    steps: [
      '「PBI」画面で新規 PBI を作成。優先度 (MoSCoW)・見積 (Fibonacci)・期限を設定できます',
      'ビューは「バックログ／カンバン／タイムライン」を切り替え可能。ステータスや優先度で絞り込めます',
      'プロジェクト／スプリントの詳細ページでは、配下の PBI をリスト／カンバンで確認できます',
      'PBI の配下に SBI (サブタスク) を追加して、より細かく分解できます',
    ],
  },
  {
    icon: '🗂️',
    title: 'データベース・スプレッドシート',
    body: '「/db」で任意スキーマのデータベースを作成できます。列の型は text/number/select/checkbox/date/relation/rollup/formula に対応。',
    steps: [
      'テーブル／ボード／ギャラリー／カレンダー／フォームの各ビューを切り替えられます',
      'ドキュメント内に「/sheet」でスプレッドシートを埋め込み、=SUM などの数式が使えます',
    ],
  },
  {
    icon: '🔍',
    title: '検索とナビゲーション',
    body: '上部の検索からページや PBI を横断的に探せます。サイドバーのお気に入り (☆) でよく使うページに素早くアクセスできます。',
  },
  {
    icon: '🔗',
    title: '共有とコラボレーション',
    body: 'ページは「公開共有」で読み取り専用リンクを発行できます (社内向け埋め込みは自動で非表示)。本文中の選択範囲にインラインコメントを付けたり、メンションで通知を送れます。',
  },
];

function HelpPage() {
  return (
    <div className="w-full max-w-none px-6 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">📖 SYNAPSE の使い方</h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Link to="/" className="hover:underline">
            ← ワークスペースに戻る
          </Link>
          {' · '}
          主要機能の操作ガイドです。いつでもこのページに戻ってこられます。
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2" data-testid="help-sections">
        {SECTIONS.map((s) => (
          <section
            key={s.title}
            data-testid={`help-section-${s.title}`}
            className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="mb-2 flex items-center gap-2 text-base font-medium">
              <span aria-hidden className="text-xl">
                {s.icon}
              </span>
              {s.title}
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">{s.body}</p>
            {s.steps ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
                {s.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-zinc-400">
        困ったときは、まずこのページへ。SYNAPSE はあなたの作業を、もっと滑らかにします。
      </p>
    </div>
  );
}
