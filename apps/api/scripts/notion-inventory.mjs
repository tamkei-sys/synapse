/**
 * Notion 機能棚卸し → backlog PBI 一括起票 (D3 / PBI-35).
 *
 * 本スクリプトは dev DB に直接書く想定。実環境では使わない。
 * 全 PBI は PRJ-7 (Notion 級ドキュメント基盤) に紐づけ、status='backlog'
 * で登録する。priority は MoSCoW に合わせて must/should/could を割り当て。
 */
import { spawnSync } from 'node:child_process';

const WS = '01KSRDNCK75Z5QDTGWYTY7JMSF';
const PRJ = '01KSSEB4QRQCFY97W59TJSYGQG';

const HELPER = 'apps/api/scripts/roadmap-helper.mjs';

/** [title, estimate(sp), priority] */
const ITEMS = [
  // A. エディタブロック / マーク (Notion 標準ブロックを順に網羅)
  ['エディタ: Toggle (折りたたみ) ブロック', 5, 'should'],
  ['エディタ: Callout (info/warning/success/note) ブロック', 3, 'should'],
  ['エディタ: 数式ブロック + インライン数式 (KaTeX)', 5, 'could'],
  ['エディタ: 画像アップロード + R2 保存 + リサイズ', 8, 'must'],
  ['エディタ: ファイル添付 + ダウンロード', 5, 'should'],
  ['エディタ: 動画 / 音声 埋め込み (R2)', 5, 'could'],
  ['エディタ: Web bookmark 自動プレビュー (OG タグ抽出)', 5, 'should'],
  ['エディタ: iframe embed (YouTube / Figma / Loom / GitHub Gist)', 5, 'should'],
  ['エディタ: コードブロックのシンタックスハイライト (lowlight)', 3, 'should'],
  ['エディタ: カラム / 多段組レイアウト', 8, 'could'],
  ['エディタ: シンプルテーブル (DB ではない単純表)', 5, 'should'],
  ['エディタ: 目次 (TOC) 自動生成ブロック', 3, 'could'],
  ['エディタ: 同期ブロック (複数ページで同一内容を共有)', 13, 'could'],
  ['エディタ: 区切り線の色 / バリエーション', 1, 'wont'],
  ['エディタ: 文字色 / 背景色マーク', 3, 'should'],

  // B. ページ機能
  ['ページ: 絵文字 / 画像アイコン', 3, 'should'],
  ['ページ: カバー画像 (R2)', 5, 'should'],
  ['ページ: お気に入り / ピン留め', 3, 'should'],
  ['ページ: 履歴 / バージョン復元 (Yjs スナップショット)', 13, 'should'],
  ['ページ: テンプレート (作成時にプリセット適用)', 8, 'should'],
  ['ページ: 公開共有 (read-only URL + token)', 8, 'should'],
  ['ページ: ゴミ箱 / 復元 / 物理削除', 5, 'must'],

  // C. DB ビュー & 機能 (PBI-30 の続き)
  ['DB: Board ビュー (select 列でカラム化)', 8, 'must'],
  ['DB: Gallery ビュー (カード + 画像)', 5, 'should'],
  ['DB: Calendar ビュー (date 列で配置)', 8, 'should'],
  ['DB: Timeline / Gantt ビュー (開始/終了)', 13, 'could'],
  ['DB: フィルタ / ソート / グループ', 8, 'must'],
  ['DB: Relation 列 (block_dependency を再利用)', 8, 'must'],
  ['DB: Rollup 列 (relation 経由の集計)', 8, 'should'],
  ['DB: Formula 列 (HyperFormula 統合)', 13, 'should'],
  ['DB: Form ビュー (匿名でも行追加できる入力フォーム)', 8, 'could'],

  // D. メンション / 日付 / リマインダー
  ['インライン日付メンション + 相対表記 ("明日 14:00")', 5, 'should'],
  ['リマインダー (notification 連動)', 5, 'should'],
  ['@page インライン参照 (autocomplete)', 5, 'should'],

  // E. ナビ / 検索 / 並べ替え
  ['ブロックレベルコメント (各行に discussion)', 8, 'should'],
  ['行ドラッグハンドル + dnd-kit ブロック並べ替え', 8, 'must'],
  ['Sidebar tree のドラッグドロップで親子変更', 8, 'should'],
  ['バックリンク表示 (このページを参照中のページ一覧)', 5, 'must'],
  ['ページ内検索 (Cmd+F)', 3, 'should'],

  // F. AI
  ['/ai write — 文脈から続きを書く', 8, 'should'],
  ['/ai summarize — ページ全体を要約', 5, 'should'],
  ['/ai translate — 選択範囲を翻訳', 5, 'could'],
  ['/ai rewrite — 箇条書き ↔ 散文の相互変換', 5, 'could'],
];

let okCount = 0;
let failCount = 0;
for (const [title, est, priority] of ITEMS) {
  const r = spawnSync(
    'node',
    [
      HELPER,
      'pbi-create',
      WS,
      title,
      `--project=${PRJ}`,
      `--est=${est}`,
      `--status=backlog`,
      `--priority=${priority}`,
    ],
    { stdio: ['ignore', 'pipe', 'inherit'] },
  );
  if (r.status === 0) {
    okCount++;
    process.stdout.write(`✓ ${r.stdout.toString().trim()}  [${est}sp ${priority}] ${title}\n`);
  } else {
    failCount++;
    console.error(`✗ failed: ${title}`);
  }
}
console.log(`\n=== ${okCount} created, ${failCount} failed ===`);
