/**
 * Built-in default page templates (PBI-105).
 *
 * Every workspace is seeded with a curated set of generic software-team
 * document templates (plans, reports, runbooks, specs, meeting notes).
 * They are ordinary template pages (`props.isTemplate = true`) carrying a
 * `props.doc` TipTap snapshot; the sync server seeds the editable Yjs
 * state from that snapshot on first open (see apps/sync template-schema).
 *
 * Templates use ONLY standard nodes (headings, paragraphs, bullet/ordered
 * lists, task lists, tables) so the sync seeder can encode them. Content is
 * intentionally generic — placeholder guidance only, no org-specific data.
 *
 * `builtinKey` makes seeding idempotent: re-running only adds templates a
 * workspace doesn't already have, so the set can grow over time.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { ulid } from 'ulid';

import * as schema from '@synapse/schema/db';

import type { Database } from '../db.js';
import type { PageDoc } from './page-doc.js';

// ---- TipTap JSON builders ---------------------------------------------------

type Node = Record<string, unknown>;

const text = (s: string): Node => ({ type: 'text', text: s });
const p = (s = ''): Node => (s ? { type: 'paragraph', content: [text(s)] } : { type: 'paragraph' });
const h = (level: 1 | 2 | 3, s: string): Node => ({
  type: 'heading',
  attrs: { level },
  content: [text(s)],
});
const bullets = (...items: string[]): Node => ({
  type: 'bulletList',
  content: items.map((t) => ({ type: 'listItem', content: [p(t)] })),
});
const steps = (...items: string[]): Node => ({
  type: 'orderedList',
  content: items.map((t) => ({ type: 'listItem', content: [p(t)] })),
});
const tasks = (...items: string[]): Node => ({
  type: 'taskList',
  content: items.map((t) => ({
    type: 'taskItem',
    attrs: { checked: false },
    content: [p(t)],
  })),
});
const cell = (s: string, header = false): Node => ({
  type: header ? 'tableHeader' : 'tableCell',
  content: [p(s)],
});
const table = (headers: string[], rows: string[][]): Node => ({
  type: 'table',
  content: [
    { type: 'tableRow', content: headers.map((hh) => cell(hh, true)) },
    ...rows.map((r) => ({ type: 'tableRow', content: r.map((c) => cell(c)) })),
  ],
});
const doc = (...content: Node[]): PageDoc => ({ type: 'doc', content });

// ---- template definitions ---------------------------------------------------

export type TemplateDef = {
  key: string;
  title: string;
  icon: string;
  doc: PageDoc;
};

export const DEFAULT_TEMPLATES: TemplateDef[] = [
  {
    key: 'work-plan',
    title: '作業計画書',
    icon: '📋',
    doc: doc(
      h(1, '作業計画書'),
      p('この計画の目的を 2〜3 行で。関連するチケット・上位計画があればリンクする。'),
      h(2, '1. 目的・非目的'),
      bullets('目的：この作業で達成したいこと', '非目的：今回はやらないこと（スコープ外）'),
      h(2, '2. 背景・経緯'),
      p('なぜこの作業が必要になったか、関連する事実関係を簡潔に。'),
      h(2, '3. 達成条件（チェックリスト）'),
      tasks('達成条件 1', '達成条件 2', '達成条件 3'),
      h(2, '4. 行動計画（タスク分解）'),
      table(
        ['タスクID', '内容', '想定工数(h)', '担当'],
        [
          ['T1', '', '', ''],
          ['T2', '', '', ''],
        ],
      ),
      h(2, '5. 前提・リスク'),
      bullets('前提：開始時点で判明していること', 'リスク：想定される問題と対応策'),
      h(2, '6. 中止条件'),
      p('どうなったら作業を中断・中止するかの基準。'),
    ),
  },
  {
    key: 'work-report',
    title: '作業報告書',
    icon: '✅',
    doc: doc(
      h(1, '作業報告書'),
      p('対応する計画書があればリンクする。'),
      h(2, '1. 実施サマリー'),
      p('結論を先に 3〜7 行で。何を実施し、達成/未達は何か、想定との比較、大きな問題の有無。'),
      h(2, '2. 達成状況'),
      bullets('目的に対する達成度：達成 / 部分達成 / 未達成 と根拠', '想定との差異とその理由'),
      h(2, '3. 達成条件ごとの成果'),
      tasks('達成条件 1：Yes / No / Partial（根拠）', '達成条件 2：Yes / No / Partial（根拠）'),
      h(2, '4. 実施結果（タスク別）'),
      table(
        ['タスクID', '結果', '想定との差異', '実績(h)', '根拠/証跡'],
        [
          ['T1', '完了/未完', '', '', ''],
          ['T2', '完了/未完', '', '', ''],
        ],
      ),
      h(2, '5. 発生した問題・リスク'),
      p('発生した事実 → 対応 → 影響。計画外の事象も隠さず記載する。'),
      h(2, '6. 次のステップ'),
      bullets('次にやるべきこと 1（理由）', '次にやるべきこと 2'),
      h(2, '7. 学び・改善'),
      p('プロセス改善に直結する学びのみ（見積りのズレ、用意すべきだった情報など）。'),
      h(2, '8. レビュー用チェックリスト'),
      tasks(
        '冒頭に結論がある',
        '達成状況が Yes/No/Partial で明確',
        '各達成条件に根拠がある',
        '計画との差異が論理的に説明されている',
      ),
    ),
  },
  {
    key: 'research-report',
    title: '調査報告書',
    icon: '🔍',
    doc: doc(
      h(1, '調査報告書'),
      h(2, '1. 調査概要'),
      bullets('経緯：調査が必要になった理由', '目的：何を判断・決定・提言したいか', '対象：システム/機能/データ/期間/環境'),
      h(2, '2. 結論'),
      p('最終的な結論（判断・決定・仮説・提言）を簡潔に。必要なら推奨対応も。'),
      h(2, '3. 調査前提'),
      bullets('調査方針・手法', '使用ツール', '事前にわかっていること', '未確認事項・制約'),
      h(2, '4. 調査内容（実施したこと）'),
      p('実際に何を調べたか。手順・確認対象を記載（結論や分析はここには書かない）。'),
      h(2, '5. 調査結果（事実と分析）'),
      bullets('事実関係：確認できた重要な事実', '分析・考察：原因/影響/合理的な解釈'),
      h(2, '6. 未解決事項・追加調査'),
      p('残っている疑問点、追加で確認が必要な事項。'),
    ),
  },
  {
    key: 'task-report',
    title: '個別作業実施報告書',
    icon: '🧾',
    doc: doc(
      h(1, '個別作業実施報告書'),
      h(2, '1. 作業概要'),
      bullets('経緯・背景', '作業目的', '作業対象（システム/リポジトリ/ファイル/環境）'),
      h(2, '2. 作業結果サマリ'),
      p('完了 / 一部完了 / 未完了、主な変更点、確認結果、残課題。'),
      h(2, '3. 作業前提'),
      bullets('作業方針・対応範囲', '使用環境・ツール・ブランチ', '前提・制約'),
      h(2, '4. 作業内容（実施したことの記録）'),
      p('時系列または作業単位で実施内容を記載。'),
      h(2, '5. 作業結果'),
      bullets('確認結果（テスト/ログ/画面）', '影響・補足', '成果物（PR/コミット/証跡）'),
      h(2, '6. 残課題・追加対応'),
      p('残っている課題、追加で対応が必要な事項。'),
    ),
  },
  {
    key: 'code-change-plan',
    title: 'コード修正計画書',
    icon: '🛠️',
    doc: doc(
      h(1, 'コード修正計画書'),
      p('この修正の概要を 2〜3 行で。上位計画があればリンクする。'),
      h(2, '1. 背景・課題'),
      p('修正が必要な理由、再現条件、関連 Issue。'),
      h(2, '2. 影響範囲'),
      bullets('対象モジュール/ファイル', '依存・連携先への影響', '後方互換性'),
      h(2, '3. 修正方針'),
      p('どう直すか。代替案を検討した場合はその比較も。'),
      h(2, '4. テスト計画'),
      tasks('ユニットテスト', '結合/E2E', '手動確認（観点）'),
      h(2, '5. ロールバック'),
      p('問題発生時に元に戻す手順・条件。'),
      h(2, '6. リスク・前提'),
      bullets('想定リスクと対応', '前提条件'),
    ),
  },
  {
    key: 'runbook',
    title: '手順書（Runbook）',
    icon: '📑',
    doc: doc(
      h(1, '手順書（Runbook）'),
      h(2, '目的'),
      p('この手順で何を達成するか。'),
      h(2, '前提・対象'),
      bullets('対象システム/環境', '必要な権限・事前準備'),
      h(2, '手順'),
      steps('ステップ 1', 'ステップ 2', 'ステップ 3'),
      h(2, '確認項目'),
      tasks('正常に完了したことの確認 1', '確認 2'),
      h(2, 'ロールバック手順'),
      steps('元に戻すステップ 1', 'ステップ 2'),
      h(2, '連絡先・エスカレーション'),
      p('問題発生時の連絡先・判断者。'),
    ),
  },
  {
    key: 'tech-spec',
    title: '技術仕様書',
    icon: '📐',
    doc: doc(
      h(1, '技術仕様書'),
      h(2, '1. 概要'),
      p('この機能/変更の概要を簡潔に。'),
      h(2, '2. 背景・目的'),
      p('解決したい課題と、達成したいゴール。'),
      h(2, '3. 要件'),
      bullets('機能要件', '非機能要件（性能/セキュリティ/可用性）'),
      h(2, '4. 設計'),
      bullets('アーキテクチャ', 'データモデル', 'API / インターフェース'),
      h(2, '5. 代替案'),
      p('検討した他の案と、採用しなかった理由。'),
      h(2, '6. 影響・移行'),
      bullets('既存への影響', '移行手順・データ移行'),
      h(2, '7. 未決事項'),
      p('決めきれていない論点。'),
    ),
  },
  {
    key: 'meeting-notes',
    title: '議事録',
    icon: '📝',
    doc: doc(
      h(1, '議事録'),
      bullets('日時：', '出席者：', '目的：'),
      h(2, 'アジェンダ'),
      bullets('議題 1', '議題 2'),
      h(2, '決定事項'),
      bullets('決定 1', '決定 2'),
      h(2, '議論メモ'),
      p('論点と結論を簡潔に。'),
      h(2, 'ToDo'),
      tasks('担当 / 期限 — アクション 1', 'アクション 2'),
      h(2, '次回'),
      p('日時・宿題。'),
    ),
  },
];

// ---- seeding ----------------------------------------------------------------

/**
 * Idempotently seed the built-in templates into a workspace. Skips any
 * template whose `builtinKey` already exists, so it's safe to re-run and to
 * call on every workspace create. Returns how many were inserted.
 */
export async function seedDefaultTemplates(
  db: Database,
  workspaceId: string,
  createdBy: string,
): Promise<number> {
  const existing = await db
    .select({ key: sql<string | null>`${schema.block.props}->>'builtinKey'` })
    .from(schema.block)
    .where(
      and(
        eq(schema.block.workspaceId, workspaceId),
        eq(schema.block.type, 'page'),
        sql`(${schema.block.props}->>'isTemplate') = 'true'`,
        isNull(schema.block.deletedAt),
      ),
    );
  const have = new Set(existing.map((e) => e.key).filter((k): k is string => Boolean(k)));
  const toAdd = DEFAULT_TEMPLATES.filter((t) => !have.has(t.key));
  if (toAdd.length === 0) return 0;

  await db.insert(schema.block).values(
    toAdd.map((t) => {
      const id = ulid();
      return {
        id,
        workspaceId,
        parentId: null,
        type: 'page',
        position: id,
        props: {
          title: t.title,
          icon: t.icon,
          doc: t.doc,
          isTemplate: true,
          builtinKey: t.key,
        },
        createdBy,
      };
    }),
  );
  return toAdd.length;
}
