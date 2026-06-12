/**
 * AUTO-GENERATED — do not hand-edit (regenerate via
 * apps/api/scripts/generate-default-manual.mjs, source of truth is the dev
 * workspace manual tree under page 01KT5DTBXMQW7VF5JN0NBJEWFG).
 *
 * In-app user manual (「SYNAPSE でできること」) seeded into every new
 * workspace by seedDefaultManual (see default-manual.ts / ADR-0009).
 */
import type { PageDoc } from './page-doc.js';

export type ManualPageDef = {
  key: string;
  title: string;
  icon: string;
  doc: PageDoc;
  children?: ManualPageDef[];
};

export const DEFAULT_MANUAL: ManualPageDef = {
  key: 'hub',
  title: 'SYNAPSE でできること',
  icon: '🧠',
  doc: {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: {
          level: 1,
        },
        content: [
          {
            text: '🧠 SYNAPSE でできること',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: 'SYNAPSE は、',
            type: 'text',
          },
          {
            text: 'ドキュメント・プロジェクト管理・表計算・データベース・GitHub・Claude Code',
            type: 'text',
            marks: [
              {
                type: 'bold',
                attrs: {},
              },
            ],
          },
          {
            text: ' を「ひとつのブロックモデル」に統合したワークスペースです。ページも、見出しも、PBI も、表計算のセルも——すべて同じ ',
            type: 'text',
          },
          {
            text: 'block',
            type: 'text',
            marks: [
              {
                type: 'code',
                attrs: {},
              },
            ],
          },
          {
            text: ' テーブルの 1 行。だから自在に組み合わせられます。',
            type: 'text',
          },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                text: '💡 この資料自体が SYNAPSE のページです。見出し・表・タスク・コード・引用——いま見えている構造そのものが、SYNAPSE の表現力です。',
                type: 'text',
              },
            ],
          },
        ],
      },
      {
        type: 'horizontalRule',
      },
      {
        type: 'heading',
        attrs: {
          level: 2,
        },
        content: [
          {
            text: '一言でいうと',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: '書く・決める・計算する・実装する。ばらばらのツールを行き来せず、その全部を同じワークスペースで地続きに。',
            type: 'text',
          },
        ],
      },
      {
        type: 'table',
        content: [
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableHeader',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '側面',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableHeader',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'できること',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '📝 つくる',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'リッチなドキュメント / ナレッジのリンク / 表計算・DB の埋め込み',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '📊 まわす',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PBI・SBI・Sprint / カンバン・タイムライン / GitHub 連携',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'tableRow',
            content: [
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '🤖 任せる',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableCell',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'AI で書く・要約する / Claude Code を MCP でつなぐ',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: {
          level: 2,
        },
        content: [
          {
            text: '機能別マニュアル（目次）',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: '各機能の詳しい使い方は、下の',
            type: 'text',
          },
          {
            text: '子ページ',
            type: 'text',
            marks: [
              {
                type: 'bold',
                attrs: {},
              },
            ],
          },
          {
            text: 'にまとめています。左サイドバーのツリー、またはこのページ末尾の「子ページ」一覧からも開けます。',
            type: 'text',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🚀 はじめかた',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— 画面の歩き方、最初の 5 ステップ、ショートカット',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '📝 ドキュメント & エディタ',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— リッチエディタ、整形、メンション、取り込み／書き出し（配下にスラッシュ早見表・ページ運用）',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '📊 プロジェクト管理（PRJ / Sprint / PBI / SBI）',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— 階層・ステータス・ビュー・バーンダウン・依存',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🧮 スプレッドシート',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— AG Grid + HyperFormula、',
                    type: 'text',
                  },
                  {
                    text: '=ASK()',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🗃️ データベース',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— 5 ビュー・8 列タイプ・絞り込み',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🤖 AI アシスト',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— ',
                    type: 'text',
                  },
                  {
                    text: '/ai',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '、選択 AI、ページ要点、',
                    type: 'text',
                  },
                  {
                    text: '=ASK',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🔗 GitHub 連携',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— Issue リンクと双方向同期',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🧠 Claude Code & MCP サーバー',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— MCP 接続・31 ツール・「cc で実装」',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '💬 コラボレーション',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '　— コメント・チャット・通知・同時編集',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: {
          level: 2,
        },
        content: [
          {
            text: 'すべては "ブロック"',
            type: 'text',
          },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                text: 'ページも、段落も、見出しも、表計算のセルも、PBI も、チャットも——',
                type: 'text',
              },
              {
                text: 'すべて同じ block テーブルの 1 行',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: '。だからページに表を、PBI にドキュメントを、自在に組み合わせられます。',
                type: 'text',
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: '📖 サイドバーの「使い方」(/help) にも常設のクイックガイドがあります。この資料はその詳細版です。',
            type: 'text',
            marks: [
              {
                type: 'italic',
                attrs: {},
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: {
          level: 2,
        },
        content: [
          {
            text: '🔀 フロー図ブロック（ノードグラフ ＋ 実行順ステップ再生）',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: '大きなシステムやデータパイプラインの全体構造を、ドキュメントの中に埋め込み図として描けます。色分けしたノードを線でつなぎ、「▶ 一括実行」で実行順に 1 ステップずつ点灯再生。ノードをクリックすれば詳細（説明・コード・ソースパス）が開きます。Mermaid と同じく本文に同居し、リロードしても残ります。',
            type: 'text',
          },
        ],
      },
      {
        type: 'heading',
        attrs: {
          level: 3,
        },
        content: [
          {
            text: '使い方',
            type: 'text',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '挿入：本文で /flow → 「フロー図」を選ぶと、サンプル（条件付き確率 生成パイプライン）が入ります。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '▶ 一括実行：上部中央のボタン。実行順にノードが点灯し、下部に「STEP n / total」の説明・コードが出ます。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'ステップ送り：⏮ / ⏭ で 1 歩ずつ、⟲ で先頭に戻す、1x で速度（0.5 / 1 / 2 倍）を切替。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '見回す：ホイールでズーム、背景ドラッグでパン、⤢ で全体表示、＋ / − で拡大縮小。右下のミニマップで現在位置。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '詳細：ノードをクリック → 右側パネルにタグ・説明・実装コード・ソースパス。Esc か ✕ で閉じる。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '編集：右下の「JSON を編集」でノード／エッジ／カテゴリ／ステップを直接編集（ビジュアル編集 UI は今後追加）。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: {
          level: 3,
        },
        content: [
          {
            text: '構成要素（FlowDoc）',
            type: 'text',
          },
        ],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'categories … 凡例＝色分けの定義（id / label / color）',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'nodes … ノード（id / label / categoryId / x / y、任意で subtitle / tags / description / code / sourcePath）',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'edges … 矢印（id / source / target、左 → 右フロー）',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'steps … 「一括実行」で順に点灯させる段（id / title / nodeIds、任意で description / code）。省略すると依存関係から自動生成。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: {
          level: 3,
        },
        content: [
          {
            text: '例：最小のフロー（コピーして使えます）',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: '/flow で挿入したあと「JSON を編集」を開き、下を貼り付けると差し替えられます。',
            type: 'text',
          },
        ],
      },
      {
        type: 'codeBlock',
        attrs: {
          language: 'json',
        },
        content: [
          {
            text: '{\n  "title": "リリースの流れ",\n  "categories": [\n    { "id": "dev", "label": "開発", "color": "#38bdf8" },\n    { "id": "ci", "label": "CI", "color": "#f59e0b" },\n    { "id": "ship", "label": "リリース", "color": "#10b981" }\n  ],\n  "nodes": [\n    { "id": "code", "label": "実装", "categoryId": "dev", "x": 40, "y": 60 },\n    { "id": "review", "label": "レビュー", "categoryId": "dev", "x": 280, "y": 60 },\n    { "id": "test", "label": "CI テスト", "categoryId": "ci", "x": 520, "y": 60 },\n    { "id": "deploy", "label": "デプロイ", "categoryId": "ship", "x": 760, "y": 60 }\n  ],\n  "edges": [\n    { "id": "e1", "source": "code", "target": "review" },\n    { "id": "e2", "source": "review", "target": "test" },\n    { "id": "e3", "source": "test", "target": "deploy" }\n  ],\n  "steps": [\n    { "id": "s1", "title": "実装", "nodeIds": ["code"] },\n    { "id": "s2", "title": "レビュー", "nodeIds": ["review"] },\n    { "id": "s3", "title": "CI", "nodeIds": ["test"] },\n    { "id": "s4", "title": "リリース", "nodeIds": ["deploy"] }\n  ]\n}\n',
            type: 'text',
          },
        ],
      },
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                text: '💡 ノード位置 x / y は手置きです（左 → 右に並べると線がきれいに流れます）。steps を省けば依存関係から実行順を自動生成します。',
                type: 'text',
              },
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: '下に、実際に動くフロー図の例を置いておきます。▶ 一括実行 を押してみてください 👇',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            marks: [
              {
                type: 'italic',
              },
            ],
            text: '※ ここには Flow ブロック（実行順つきノードグラフ）のライブ例が入ります。エディタで「/flow」と入力すると挿入できます。',
          },
        ],
      },
    ],
  },
  children: [
    {
      key: 'getting-started',
      title: '🚀 はじめかた',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🚀 はじめかた',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '最初の一歩と画面の歩き方をまとめます。各機能の詳細は、トップ「SYNAPSE でできること」配下の機能別マニュアルへ。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '画面の歩き方（左サイドバー）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ワークスペース切替',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — 上部メニューで所属ワークスペースを切替',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '🔔 通知ベル / 検索ヒント',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — メンションやリマインダーの通知',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '管理',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — 📁 プロジェクト / 🏃 スプリント / ✅ PBI / 🟢 SBI / 💬 チャット',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '⭐ お気に入り',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — ☆ を付けたページがここに並ぶ',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ページ',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — ドキュメントのツリー。',
                        type: 'text',
                      },
                      {
                        text: '+',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で新規、ドラッグで階層・並び替え、📋 からテンプレート挿入',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '設定',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — 👥 メンバー / 🔑 API トークン / 📋 監査ログ / 🗑️ ゴミ箱 / 📖 使い方',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ユーザーメニュー',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — 最下部（ログアウト）',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'まずはこの 5 ステップ',
                type: 'text',
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'サイドバー「ページ」の ',
                        type: 'text',
                      },
                      {
                        text: '+',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で新しいページを作る',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '本文で ',
                        type: 'text',
                      },
                      {
                        text: '/',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を打つとブロックメニューが開く（見出し・リスト・表・コード・画像…）',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '/pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' と打つとその場で PBI を起票 — PBI 一覧／ボードにも自動で並ぶ',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Cmd/Ctrl + K',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' でページ・PBI・シートへ横断ジャンプ',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '「設定 → API トークン」でトークンを発行し、',
                        type: 'text',
                      },
                      {
                        text: 'Claude Code（MCP）',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' をつなぐ',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'どこでも使えるショートカット',
                type: 'text',
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'キー',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '動作',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'Cmd/Ctrl + K',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'コマンドパレット（横断検索＆移動）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '?',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'キーボードショートカット一覧',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'Esc',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'モーダル / ポップオーバーを閉じる',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '/',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'スラッシュメニュー（本文編集中）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '@',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ページメンション / リンク（本文編集中）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'Cmd/Ctrl + B / I',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '太字 / 斜体',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'Cmd/Ctrl + Z',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '元に戻す（Yjs の Undo）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'Cmd/Ctrl + K',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: ' （選択中）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'リンクを付与',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '💡 コマンドパレットは「→ PBI 一覧へ」などの移動コマンドと、Typesense による全文検索の両方をまとめて出します。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ワークスペースとメンバー',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'データはすべてワークスペース単位で隔離されます（MCP トークンも 1 ワークスペースに固定）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '設定 → メンバー で招待・ロール（',
                        type: 'text',
                      },
                      {
                        text: 'owner / admin / member',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）管理。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '設定 → 監査ログ で MCP 経由の操作履歴（誰が・どのツールを・いつ）を確認。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      key: 'docs-editor',
      title: '📝 ドキュメント & エディタ',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '📝 ドキュメント & エディタ',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '本文は ',
                type: 'text',
              },
              {
                text: 'TipTap（ProseMirror）',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' のリッチエディタ。実体は ',
                type: 'text',
              },
              {
                text: 'Yjs',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' の共有ドキュメントで、自動保存・オフライン編集・複数人の同時編集に対応します。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'リアルタイム共同編集',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '上部のバッジが接続状態を表示：',
                        type: 'text',
                      },
                      {
                        text: '同期中 / 接続中… / オフライン / 切断',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '同じページを開いている人のアバターが「同時編集」として並ぶ（プレゼンス）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'オフラインでも編集でき、再接続時に自動マージ（CRDT）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '文字をととのえる',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '上部ツールバー',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：太字 / 斜体 / 下線 / 取り消し線 / インラインコード、見出し H1–H3、箇条書き・番号・チェックリスト・引用・コードブロック、リンク、🎨 文字色＆マーカー。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'バブルメニュー',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：テキストを選択すると浮かぶ。整形・リンク・💬 コメント・✨AI（要約／翻訳／書き換え）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Markdown 入力',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：',
                        type: 'text',
                      },
                      {
                        text: '**太字**',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '# 見出し',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '> 引用',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '- 箇条書き',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' などはその場で整形されます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '表',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：表の中にカーソルを置くと、行・列の追加／削除ボタンがツールバーに出ます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ブロックを挿入する',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '/',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '（スラッシュ）でブロックメニュー。見出し・リスト・表・コード・コールアウト・数式・Mermaid 図・カラム・トグル・各種埋め込みなど ',
                        type: 'text',
                      },
                      {
                        text: '40 種以上',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '。詳しくは子ページ「スラッシュコマンド & ブロック早見表」。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '@',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で別ページへのメンション（リンク）。参照されたページには ',
                        type: 'text',
                      },
                      {
                        text: 'バックリンク',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' が自動で並びます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ページ内に子ページを作るとツリーで階層管理。パンくず・子ページ一覧・バックリンクが本文下に出ます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '取り込み・書き出し',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '📥 取り込み',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：',
                        type: 'text',
                      },
                      {
                        text: '.md',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: '.html',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ファイルを本文に挿入。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '⬇️ MD',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：Markdown ファイルとしてダウンロード。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '🖨️ PDF',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：ブラウザの印刷ダイアログから PDF 保存。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '📋 MD / 📋 HTML',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '：本文を Markdown / HTML としてクリップボードへコピー。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ページ内検索・カバー・アイコン',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ページ内検索バーで本文中の語をハイライト。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '🖼️ カバー画像とページアイコン（絵文字）でページを識別しやすく。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'horizontalRule',
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'このページの子ページ：',
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                    attrs: {},
                  },
                ],
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '⌨️ スラッシュコマンド & ブロック早見表',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '🗂️ ページ運用（履歴・共有・テンプレート・リマインダー）',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
          },
        ],
      },
      children: [
        {
          key: 'slash-commands',
          title: '⌨️ スラッシュコマンド & ブロック早見表',
          icon: '📄',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: {
                  level: 1,
                },
                content: [
                  {
                    text: '⌨️ スラッシュコマンド & ブロック早見表',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'paragraph',
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '基本ブロック',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'table',
                content: [
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'コマンド',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '内容',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '見出し 1 / 2 / 3',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'セクション見出し',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '箇条書き / 番号付きリスト',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '・印 / 1. 2. 3. のリスト',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '引用',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '引用ブロック',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'コードブロック',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'シンタックスハイライト付きコード',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '区切り線',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '色を変えられる水平線',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '目次',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '見出しから自動生成される目次',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '日付',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '相対表記の日付メンション',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: 'リッチブロック',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'table',
                content: [
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'コマンド',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '内容',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'Callout',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '情報 / 注意 / 成功 / メモ の囲み（4 トーン）',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'トグル',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '折りたたみできるブロック',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'テーブル',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '3×3 の表を挿入',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '2 カラム',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '横並びの段組レイアウト',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '同期ブロック',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '別ページの内容をライブ表示（ミラー）',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '数式ブロック / インライン数式',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'KaTeX で組版',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'Mermaid 図',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'フローチャート / シーケンス / ガント等をコードから描画',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '埋め込み',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'YouTube / Figma / Loom などを iframe 埋め込み',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: 'メディア',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'table',
                content: [
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'コマンド',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '内容',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/画像',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '画像をアップロードして挿入',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/ファイル',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'ファイルを添付（ダウンロード可能）',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/動画',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: ' / ',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '動画を埋め込み',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/音声',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '音声を埋め込み',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/ブックマーク',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'URL の OG プレビューをカードで挿入',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: 'ワークアイテム・連携',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'table',
                content: [
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'コマンド',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '内容',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                      {
                        type: 'tableHeader',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/pbi',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'PBI を作成し、参照ノードを挿入',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/project',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: ' / ',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/sprint',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'プロジェクト / スプリントを作成',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/sheet',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'スプレッドシート（AG Grid + HyperFormula）を埋め込み',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/db',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '任意スキーマのデータベースを本文に埋め込み',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/pr',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'GitHub PR（owner/repo#番号）を埋め込み',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/page',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'サブページを作成してリンク',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableRow',
                    content: [
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: '/ai',
                                type: 'text',
                                marks: [
                                  {
                                    type: 'code',
                                    attrs: {},
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        content: [
                          {
                            type: 'paragraph',
                            content: [
                              {
                                text: 'AI で文章を生成して挿入（→「AI アシスト」）',
                                type: 'text',
                              },
                            ],
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                      {
                        type: 'tableCell',
                        attrs: {
                          colspan: 1,
                          rowspan: 1,
                        },
                        content: [
                          {
                            type: 'paragraph',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: 'インライン装飾',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'テキストには ',
                    type: 'text',
                  },
                  {
                    text: '太字',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '、',
                    type: 'text',
                  },
                  {
                    text: '斜体',
                    type: 'text',
                    marks: [
                      {
                        type: 'italic',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '、',
                    type: 'text',
                  },
                  {
                    text: '取り消し線',
                    type: 'text',
                    marks: [
                      {
                        type: 'strike',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '、',
                    type: 'text',
                  },
                  {
                    text: 'インラインコード',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '、文字色／蛍光マーカーを混在できます。',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'blockquote',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '📝 この資料は DB へ直接 seed した都合で標準ブロック構成ですが、機能としては上記すべて利用可能です。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
        {
          key: 'page-ops',
          title: '🗂️ ページ運用（履歴・共有・テンプレート・リマインダー）',
          icon: '📄',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: {
                  level: 1,
                },
                content: [
                  {
                    text: '🗂️ ページ運用',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'ページ右上のツールバーから使える、版管理・共有・テンプレート・リマインダー・ドキュメント情報をまとめます。',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '🕐 履歴（バージョン）',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「現在を保存」で手動版を作成。編集中は約 5 分間隔で自動版も積まれます（1 ページ最大 50 版）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '各版から「復元」で本文を巻き戻し（Yjs に新しい変更として反映）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「差分」で選んだ版と現在の語単位の差分を表示。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '🔗 公開共有（read-only）',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「このページを公開する」で ',
                            type: 'text',
                          },
                          {
                            text: '/share/<token>',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: ' の閲覧専用リンクを発行。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'リンクを知っている人は誰でも閲覧可（編集不可・社内向け埋め込みは非表示）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「公開を停止」でいつでも無効化。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '📋 テンプレート',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    text: '「テンプレートとして保存」で現在のページを複製可能なテンプレ化。サイドバー「ページ」の 📋 から挿入できます。最初から次の組み込みテンプレートが使えます：',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '作業計画書 / 作業報告書（計画書からは「報告書を作成」で対応する報告書を生成）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '調査報告書 / 個別作業実施報告書',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'コード修正計画書 / 手順書（Runbook）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '技術仕様書 / 議事録',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '⏰ リマインダー',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '日時とメッセージを指定して、このページに自分宛てのリマインダーを作成。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '繰り返し：',
                            type: 'text',
                          },
                          {
                            text: 'なし / 毎日 / 毎週 / 毎月',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '時間が来ると通知ベルに届きます（💤 で 10 分スヌーズ）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '📑 ドキュメント情報',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ステータス：',
                            type: 'text',
                          },
                          {
                            text: '下書き → レビュー待ち → 承認済み → アーカイブ',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '種別：',
                            type: 'text',
                          },
                          {
                            text: '仕様 / 設計 / 計画 / 報告 / 手順 / メモ / その他',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'レビュアー指定・タグ付け。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「要点 (AI)」で本文から要点を 3〜5 項目に自動生成（→「AI アシスト」）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '🗑️ ゴミ箱',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ゴミ箱への移動はページとその子ページをまとめてソフト削除（取り消し可能）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '左サイドバー「ゴミ箱」から復元できます。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 1,
                },
                content: [
                  {
                    text: '🗂️ ページ運用',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    text: 'ページ右上のツールバーから使える、版管理・共有・テンプレート・リマインダー・ドキュメント情報をまとめます。',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '🕐 履歴（バージョン）',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「現在を保存」で手動版を作成。編集中は約 5 分間隔で自動版も積まれます（1 ページ最大 50 版）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '各版から「復元」で本文を巻き戻し（Yjs に新しい変更として反映）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「差分」で選んだ版と現在の語単位の差分を表示。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '🔗 公開共有（read-only）',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「このページを公開する」で ',
                            type: 'text',
                          },
                          {
                            text: '/share/<token>',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: ' の閲覧専用リンクを発行。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'リンクを知っている人は誰でも閲覧可（編集不可・社内向け埋め込みは非表示）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「公開を停止」でいつでも無効化。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '📋 テンプレート',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    text: '「テンプレートとして保存」で現在のページを複製可能なテンプレ化。サイドバー「ページ」の 📋 から挿入できます。最初から次の組み込みテンプレートが使えます：',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '作業計画書 / 作業報告書（計画書からは「報告書を作成」で対応する報告書を生成）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '調査報告書 / 個別作業実施報告書',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'コード修正計画書 / 手順書（Runbook）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '技術仕様書 / 議事録',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '⏰ リマインダー',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '日時とメッセージを指定して、このページに自分宛てのリマインダーを作成。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '繰り返し：',
                            type: 'text',
                          },
                          {
                            text: 'なし / 毎日 / 毎週 / 毎月',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '時間が来ると通知ベルに届きます（💤 で 10 分スヌーズ）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '📑 ドキュメント情報',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ステータス：',
                            type: 'text',
                          },
                          {
                            text: '下書き → レビュー待ち → 承認済み → アーカイブ',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '種別：',
                            type: 'text',
                          },
                          {
                            text: '仕様 / 設計 / 計画 / 報告 / 手順 / メモ / その他',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'レビュアー指定・タグ付け。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '「要点 (AI)」で本文から要点を 3〜5 項目に自動生成（→「AI アシスト」）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'heading',
                attrs: {
                  level: 2,
                },
                content: [
                  {
                    text: '🗑️ ゴミ箱',
                    type: 'text',
                  },
                ],
              },
              {
                type: 'bulletList',
                content: [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ゴミ箱への移動はページとその子ページをまとめてソフト削除（取り消し可能）。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '左サイドバー「ゴミ箱」から復元できます。',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      ],
    },
    {
      key: 'project-management',
      title: '📊 プロジェクト管理（PRJ / Sprint / PBI / SBI）',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '📊 プロジェクト管理（PRJ / Sprint / PBI / SBI）',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '作業は 4 つの階層で構造化します。どの種別も詳細ページ ',
                type: 'text',
              },
              {
                text: '/b/<id>',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' で開き、メタ情報の編集とドキュメント本文編集ができます。',
                type: 'text',
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '階層',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '単位',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '役割',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'PRJ（プロジェクト）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '—',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '最上位のまとまり',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'Sprint（スプリント）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '期間',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '2 週間を既定に区切る反復',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'PBI',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ストーリー（pt）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ユーザー価値の単位',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'SBI',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'サブタスク（h）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '実装の最小単位（時間見積）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ステータスと優先度',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PBI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'backlog → ready → in_progress → review → done',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'SBI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'todo → in_progress → review → done → archived',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Sprint：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'planning → active → review → done',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Project：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'backlog → planned → in_progress → paused → review → done → cancelled → archived',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '優先度（MoSCoW）：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'must / should / could / wont',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PBI 見積（フィボナッチ pt）：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '1 2 3 5 8 13 21',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '。SBI は時間（h）で見積。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ビュー',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PBI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' バックログ（一覧）/ カンバン（ステータス列・ドラッグ or ボタンで遷移）/ タイムライン（期限 dueDate を軸に期間バー）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'プロジェクト・スプリント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' リスト / カンバン。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'SBI ボード：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ステータス列のカンバン。親 PBI 必須。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '表示したビューはブラウザに記憶されます。ステータス・優先度で絞り込み可。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '詳細ページでできること',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'タイトル・ステータス・優先度・担当者・期間をその場で編集。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '本文（Yjs ドキュメント）に仕様や議論を書ける。コメント欄つき。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'プロジェクト → 配下 PBI 一覧、スプリント → 配下 PBI＋バーンダウン、PBI → 配下 SBI 一覧。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'バーンダウン & 進捗',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'スプリント詳細に理想線（破線）と残時間（実線）のバーンダウンチャート。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '「PBI x / y 完了」など進捗サマリ。MCP の ',
                        type: 'text',
                      },
                      {
                        text: 'synapse_sprint_metrics',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' でも取得可。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'SBI のアラート',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '実績が見積を超えると「超過」、着手から 4 日以上「進行中」のままだと「停滞」のバッジ。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '親 PBI の見出しに「⚠ N 件要注意」を集計表示。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '依存関係',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'ブロック間の「これに依存している（blocked by）／これをブロックしている」を記録できます。Claude Code（MCP）の ',
                type: 'text',
              },
              {
                text: 'synapse_add_dependency',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'synapse_list_dependencies',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' から操作・確認できます。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '📊 プロジェクト管理（PRJ / Sprint / PBI / SBI）',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '作業は 4 つの階層で構造化します。どの種別も詳細ページ ',
                type: 'text',
              },
              {
                text: '/b/<id>',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' で開き、メタ情報の編集とドキュメント本文編集ができます。',
                type: 'text',
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '階層',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '単位',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '役割',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'PRJ（プロジェクト）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '—',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '最上位のまとまり',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'Sprint（スプリント）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '期間',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '2 週間を既定に区切る反復',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'PBI',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ストーリー（pt）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ユーザー価値の単位',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'SBI',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'サブタスク（h）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    attrs: {
                      colspan: 1,
                      rowspan: 1,
                    },
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '実装の最小単位（時間見積）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ステータスと優先度',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PBI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'backlog → ready → in_progress → review → done',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'SBI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'todo → in_progress → review → done → archived',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Sprint：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'planning → active → review → done',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Project：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'backlog → planned → in_progress → paused → review → done → cancelled → archived',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '優先度（MoSCoW）：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'must / should / could / wont',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PBI 見積（フィボナッチ pt）：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '1 2 3 5 8 13 21',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '。SBI は時間（h）で見積。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ビュー',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PBI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' バックログ（一覧）/ カンバン（ステータス列・ドラッグ or ボタンで遷移）/ タイムライン（期限 dueDate を軸に期間バー）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'プロジェクト・スプリント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' リスト / カンバン。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'SBI ボード：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ステータス列のカンバン。親 PBI 必須。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '表示したビューはブラウザに記憶されます。ステータス・優先度で絞り込み可。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '詳細ページでできること',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'タイトル・ステータス・優先度・担当者・期間をその場で編集。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '本文（Yjs ドキュメント）に仕様や議論を書ける。コメント欄つき。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'プロジェクト → 配下 PBI 一覧、スプリント → 配下 PBI＋バーンダウン、PBI → 配下 SBI 一覧。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'バーンダウン & 進捗',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'スプリント詳細に理想線（破線）と残時間（実線）のバーンダウンチャート。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '「PBI x / y 完了」など進捗サマリ。MCP の ',
                        type: 'text',
                      },
                      {
                        text: 'synapse_sprint_metrics',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' でも取得可。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'SBI のアラート',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '実績が見積を超えると「超過」、着手から 4 日以上「進行中」のままだと「停滞」のバッジ。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '親 PBI の見出しに「⚠ N 件要注意」を集計表示。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '依存関係',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'ブロック間の「これに依存している（blocked by）／これをブロックしている」を記録できます。Claude Code（MCP）の ',
                type: 'text',
              },
              {
                text: 'synapse_add_dependency',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'synapse_list_dependencies',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' から操作・確認できます。',
                type: 'text',
              },
            ],
          },
        ],
      },
    },
    {
      key: 'spreadsheet',
      title: '🧮 スプレッドシート',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
          },
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🧮 スプレッドシート',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '基本',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'セルは A1 形式。既定 ',
                        type: 'text',
                      },
                      {
                        text: '10 行 × 8 列',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '（最大 500 行 × 26 列）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'セルに入力した生の値が source of truth。リロードしても式はそのまま往復します。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '数式は HyperFormula が同期評価し、計算結果を表示します。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '数式',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '標準関数：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '=SUM(A1:A10)',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '、',
                        type: 'text',
                      },
                      {
                        text: '=AVERAGE(...)',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '、',
                        type: 'text',
                      },
                      {
                        text: '=IF(...)',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' など HyperFormula の関数が使えます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'AI セル関数：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '=ASK("プロンプト")',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で Claude を呼び、回答テキストをそのセルに表示。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            content: [
              {
                text: '=SUM(A1:A10)               … ふつうの集計\n=ASK("この列を3行で要約して")    … セルから AI を呼ぶ',
                type: 'text',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🔎 ',
                    type: 'text',
                  },
                  {
                    text: '=ASK(...)',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' は引用符で囲んだ',
                    type: 'text',
                  },
                  {
                    text: '単一の文字列',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: 'を受け取ります（例：',
                    type: 'text',
                  },
                  {
                    text: '=ASK("売上が伸びた理由を一言で")',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '）。非同期取得中はセルに ',
                    type: 'text',
                  },
                  {
                    text: '…',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' が表示され、応答が届くと差し替わります。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '※ ANTHROPIC_API_KEY 未設定の環境では、AI 応答はスタブ（動線確認用テキスト）になります。詳しくは「AI アシスト」へ。',
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                    attrs: {},
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      key: 'database',
      title: '🗃️ データベース',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🗃️ データベース',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '5 つのビュー',
                type: 'text',
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ビュー',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '内容',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'テーブル',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'セルをインライン編集。行はドラッグで並べ替え、列ヘッダから型変更・削除',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ボード',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'select 列でグループ化したカンバン（カードをドロップで値変更）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'ギャラリー',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'カード型の一覧',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'カレンダー',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'date 列を使った月間カレンダー',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'フォーム',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '入力可能な列だけのフォームで 1 行を追加',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '8 つの列タイプ',
                type: 'text',
              },
            ],
          },
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '型',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '説明',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'text',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'テキスト',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'number',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '数値',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'checkbox',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'チェック',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'select',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '選択肢（ボード／フォームのグループに使える）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'date',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '日付（カレンダーに使える）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'relation',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '別の DB の行へのリンク',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'rollup',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'relation をたどって集計（count / sum / avg / min / max / show）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'formula',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '他列を参照する式（HyperFormula 評価）',
                            type: 'text',
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'Formula 列は他の列を ',
                type: 'text',
              },
              {
                text: '{列名}',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' で参照します。例：',
                type: 'text',
              },
              {
                text: '{単価} * {数量}',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: '。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '絞り込み・並び替え・編集',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'フィルタ条件と並び替えで表示行を制御。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '「+ 行を追加」「+ 列」で行・列を追加。基本型どうしは列の型変更も可能（relation / rollup / formula は名前のみ変更）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '既定列は ',
                        type: 'text',
                      },
                      {
                        text: 'タイトル / ステータス / 期限',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      key: 'ai-assist',
      title: '🤖 AI アシスト',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🤖 AI アシスト',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'AI は Anthropic SDK 経由で ',
                type: 'text',
              },
              {
                text: 'apps/api',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' から呼び出します（ブラウザから直接は呼びません）。入口は次の通り。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'エディタの AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '/ai（AI で書く）：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' 指示文を渡すと文章を生成し、カーソル位置に挿入。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '選択して ✨AI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' テキストを選ぶとバブルメニューに ✨AI が出て、',
                        type: 'text',
                      },
                      {
                        text: '要約 / 翻訳 / 書き換え',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ができます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ページの AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '要点 (AI)：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ページ右上の 📑 情報パネルから、本文の要点を 3〜5 項目に自動生成して保存。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'スプレッドシートの AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '=ASK("プロンプト")：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' セルから Claude を呼び、回答を表示（→「スプレッドシート」）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'プロジェクト管理の AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'スプリント完了報告：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' スプリント配下の PBI / SBI を集計し、要約レポートを生成。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '使うモデル',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'モデル ID は ',
                type: 'text',
              },
              {
                text: 'packages/schema/src/models.ts',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' に集約：',
                type: 'text',
              },
              {
                text: 'claude-opus-4-7',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'claude-sonnet-4-6',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'claude-haiku-4-5',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: '。機能コードに直書きはしません。',
                type: 'text',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🛡️ 外部から取り込んだテキスト（Issue 本文や Web など）は',
                    type: 'text',
                  },
                  {
                    text: 'データ',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: 'として扱い、命令としては実行しません（プロンプトインジェクション対策）。',
                    type: 'text',
                  },
                  {
                    text: 'また ',
                    type: 'text',
                  },
                  {
                    text: 'ANTHROPIC_API_KEY',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' 未設定の環境では、各 AI 機能はスタブ応答を返します（動線確認用）。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🤖 AI アシスト',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'AI は Anthropic SDK 経由で ',
                type: 'text',
              },
              {
                text: 'apps/api',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' から呼び出します（ブラウザから直接は呼びません）。入口は次の通り。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'エディタの AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '/ai（AI で書く）：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' 指示文を渡すと文章を生成し、カーソル位置に挿入。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '選択して ✨AI：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' テキストを選ぶとバブルメニューに ✨AI が出て、',
                        type: 'text',
                      },
                      {
                        text: '要約 / 翻訳 / 書き換え',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ができます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'ページの AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '要点 (AI)：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ページ右上の 📑 情報パネルから、本文の要点を 3〜5 項目に自動生成して保存。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'スプレッドシートの AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '=ASK("プロンプト")：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' セルから Claude を呼び、回答を表示（→「スプレッドシート」）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'プロジェクト管理の AI',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'スプリント完了報告：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' スプリント配下の PBI / SBI を集計し、要約レポートを生成。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '使うモデル',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'モデル ID は ',
                type: 'text',
              },
              {
                text: 'packages/schema/src/models.ts',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' に集約：',
                type: 'text',
              },
              {
                text: 'claude-opus-4-7',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'claude-sonnet-4-6',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'claude-haiku-4-5',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: '。機能コードに直書きはしません。',
                type: 'text',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🛡️ 外部から取り込んだテキスト（Issue 本文や Web など）は',
                    type: 'text',
                  },
                  {
                    text: 'データ',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: 'として扱い、命令としては実行しません（プロンプトインジェクション対策）。また ',
                    type: 'text',
                  },
                  {
                    text: 'ANTHROPIC_API_KEY',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' 未設定の環境では、各 AI 機能はスタブ応答を返します（動線確認用）。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      key: 'github',
      title: '🔗 GitHub 連携',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🔗 GitHub 連携',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'PBI と GitHub Issue を結びつけ、状態を双方向に同期します。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'できること（実装済み）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Issue を手動でリンク：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI カードの「+ Issue を紐付け」、または MCP の ',
                        type: 'text',
                      },
                      {
                        text: 'synapse_link_github_issue',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' に ',
                        type: 'text',
                      },
                      {
                        text: 'owner / repo / issue 番号',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を渡してリンク。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'アウトバウンド同期：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI のタイトル／ステータスを変えると、リンク済み Issue へ反映（',
                        type: 'text',
                      },
                      {
                        text: 'done → closed',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '、それ以外 → ',
                        type: 'text',
                      },
                      {
                        text: 'open',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'インバウンド同期：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' GitHub の Webhook（',
                        type: 'text',
                      },
                      {
                        text: 'issues',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' イベント）を受けて、Issue 編集 → タイトル、close → ',
                        type: 'text',
                      },
                      {
                        text: 'done',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '、reopen（done 時）→ ',
                        type: 'text',
                      },
                      {
                        text: 'backlog',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'CI バッジ：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI に CI 情報があればカードにステータスバッジを表示。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '/pr：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' 本文に GitHub PR（',
                        type: 'text',
                      },
                      {
                        text: 'owner/repo#番号',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）の参照を埋め込み。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'セキュリティ',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Webhook は HMAC 署名（',
                        type: 'text',
                      },
                      {
                        text: 'X-Hub-Signature-256',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）を必ず検証し、',
                        type: 'text',
                      },
                      {
                        text: 'X-GitHub-Delivery',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で 24h 冪等化。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'アウトバウンドの送信にはサーバ側に GitHub トークンの設定が必要です。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '現状の範囲（正直な注記）',
                type: 'text',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '⚠️ 次は',
                    type: 'text',
                  },
                  {
                    text: 'まだ実装されていません',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '：Issue の自動生成、ブランチの自動作成、PR / CI イベントの本処理（Webhook では ',
                    type: 'text',
                  },
                  {
                    text: 'issues',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' 以外は受理のみ）。アウトバウンドはサーバに GitHub トークンが設定されている場合に動作します（dev 既定ではログ出力のみ）。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🔗 GitHub 連携',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'PBI と GitHub Issue を結びつけ、状態を双方向に同期します。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'できること（実装済み）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Issue を手動でリンク：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI カードの「+ Issue を紐付け」、または MCP の ',
                        type: 'text',
                      },
                      {
                        text: 'synapse_link_github_issue',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' に ',
                        type: 'text',
                      },
                      {
                        text: 'owner / repo / issue 番号',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を渡してリンク。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'アウトバウンド同期：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI のタイトル／ステータスを変えると、リンク済み Issue へ反映（',
                        type: 'text',
                      },
                      {
                        text: 'done → closed',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '、それ以外 → ',
                        type: 'text',
                      },
                      {
                        text: 'open',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'インバウンド同期：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' GitHub の Webhook（',
                        type: 'text',
                      },
                      {
                        text: 'issues',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' イベント）を受けて、Issue 編集 → タイトル、close → ',
                        type: 'text',
                      },
                      {
                        text: 'done',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '、reopen（done 時）→ ',
                        type: 'text',
                      },
                      {
                        text: 'backlog',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'CI バッジ：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI に CI 情報があればカードにステータスバッジを表示。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '/pr：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' 本文に GitHub PR（',
                        type: 'text',
                      },
                      {
                        text: 'owner/repo#番号',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）の参照を埋め込み。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'セキュリティ',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Webhook は HMAC 署名（',
                        type: 'text',
                      },
                      {
                        text: 'X-Hub-Signature-256',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）を必ず検証し、',
                        type: 'text',
                      },
                      {
                        text: 'X-GitHub-Delivery',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で 24h 冪等化。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'アウトバウンドの送信にはサーバ側に GitHub トークンの設定が必要です。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '現状の範囲（正直な注記）',
                type: 'text',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '⚠️ 次は',
                    type: 'text',
                  },
                  {
                    text: 'まだ実装されていません',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '：Issue の自動生成、ブランチの自動作成、PR / CI イベントの本処理（Webhook では ',
                    type: 'text',
                  },
                  {
                    text: 'issues',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' 以外は受理のみ）。アウトバウンドはサーバに GitHub トークンが設定されている場合に動作します（dev 既定ではログ出力のみ）。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      key: 'claude-code-mcp',
      title: '🧠 Claude Code & MCP サーバー',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🧠 Claude Code & MCP サーバー',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE には、Claude Code から操作するための ',
                type: 'text',
              },
              {
                text: 'MCP サーバー',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' が同梱されています。接続は ',
                type: 'text',
              },
              {
                text: 'stdio',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: '（標準入出力）で、追加のサーバー起動は不要です。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '接続の手順',
                type: 'text',
              },
            ],
          },
          {
            type: 'orderedList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '「設定 → API トークン」(/settings/tokens) でワークスペース用トークンを発行（作成時に一度だけ表示）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'リポジトリ直下に .mcp.json を作成（下記）。トークンを含むので必ず .gitignore に入れる。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Claude Code で /mcp を実行し、表示された「synapse」を承認すると接続完了。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            content: [
              {
                text: '{\n  "mcpServers": {\n    "synapse": {\n      "type": "stdio",\n      "command": "node",\n      "args": ["<repo>/apps/mcp/dist/index.js"],\n      "env": {\n        "DATABASE_URL": "postgres://…",\n        "SYNAPSE_API_TOKEN": "synapse_…"\n      }\n    }\n  }\n}',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '本文編集ツール（',
                type: 'text',
              },
              {
                text: 'synapse_append_doc',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'synapse_set_doc',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: '）も使うなら、env に ',
                type: 'text',
              },
              {
                text: 'SYNC_INTERNAL_URL',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' と ',
                type: 'text',
              },
              {
                text: 'SYNC_INTERNAL_SECRET',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' を追加します（sync の内部 doc-write エンドポイント）。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'スコープ（権限）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'read',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … 閲覧',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'write_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … PBI・SBI・プロジェクト・スプリント・依存の書き込み',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'write_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … コメント',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'write_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … ページ作成・改名・移動・ゴミ箱・本文編集',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'admin',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … 全許可',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '使えるツール（31 種・抜粋）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '読み取り：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'get_overview',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_projects',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_sprints',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_pbis',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_sbis',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'get_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'resolve_key',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'search',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'sprint_metrics',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_dependencies',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_comments',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_pages',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'get_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'audit_log',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PM 書き込み：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'create_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_pbi_status',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'create_sbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_sbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'create_project',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_project',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'create_sprint',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_sprint',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'add_dependency',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'remove_dependency',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'コメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'add_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'resolve_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'react_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'delete_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ページ／ドキュメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'create_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_page_title',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'move_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'trash_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'restore_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'append_doc',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'set_doc',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'GitHub：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'link_github_issue',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'unlink_github_issue',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🔑 ',
                    type: 'text',
                  },
                  {
                    text: '黄金律',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '：MCP ツールは ',
                    type: 'text',
                  },
                  {
                    text: 'ブロック id（ULID）',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' を取ります。',
                    type: 'text',
                  },
                  {
                    text: 'PBI-42',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' のような人間キーは ',
                    type: 'text',
                  },
                  {
                    text: 'synapse_resolve_key',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' で先に解決してください。',
                    type: 'text',
                  },
                  {
                    text: '書き込みツールは Claude Code 側で確認を挟み、全呼び出しは監査ログ（',
                    type: 'text',
                  },
                  {
                    text: 'synapse_audit_log',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' / 設定 → 監査ログ）に残ります。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '「cc で実装」ボタン',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'PBI から headless な Claude Code セッションを起動できます（カード／一覧／詳細の「cc で実装」）。',
                type: 'text',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '⚠️ ',
                    type: 'text',
                  },
                  {
                    text: '現状はスタブ動作',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: 'です。ローカル／サンドボックス未接続では、',
                    type: 'text',
                  },
                  {
                    text: 'queued → running → succeeded',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' と擬似的に遷移し、ダミーの PR リンクを返します。本番はサンドボックス（Cloudflare Container、',
                    type: 'text',
                  },
                  {
                    text: 'allowedTools',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' は明示 allowlist、資格情報マウントなし、',
                    type: 'text',
                  },
                  {
                    text: '--dangerously-skip-permissions',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' 禁止）で実行する設計ですが、実行本体は今後の実装です。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '🧠 Claude Code & MCP サーバー',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE には、Claude Code から操作するための ',
                type: 'text',
              },
              {
                text: 'MCP サーバー',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' が同梱されています。接続は ',
                type: 'text',
              },
              {
                text: 'stdio',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: '（標準入出力）で、追加のサーバー起動は不要です。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '接続の手順',
                type: 'text',
              },
            ],
          },
          {
            type: 'orderedList',
            attrs: {
              start: 1,
            },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '「設定 → API トークン」(/settings/tokens) でワークスペース用トークンを発行（作成時に一度だけ表示）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'リポジトリ直下に .mcp.json を作成（下記）。トークンを含むので必ず .gitignore に入れる。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'Claude Code で /mcp を実行し、表示された「synapse」を承認すると接続完了。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'codeBlock',
            content: [
              {
                text: '{\n  "mcpServers": {\n    "synapse": {\n      "type": "stdio",\n      "command": "node",\n      "args": ["<repo>/apps/mcp/dist/index.js"],\n      "env": {\n        "DATABASE_URL": "postgres://…",\n        "SYNAPSE_API_TOKEN": "synapse_…"\n      }\n    }\n  }\n}',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '本文編集ツール（',
                type: 'text',
              },
              {
                text: 'synapse_append_doc',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' / ',
                type: 'text',
              },
              {
                text: 'synapse_set_doc',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: '）も使うなら、env に ',
                type: 'text',
              },
              {
                text: 'SYNC_INTERNAL_URL',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' と ',
                type: 'text',
              },
              {
                text: 'SYNC_INTERNAL_SECRET',
                type: 'text',
                marks: [
                  {
                    type: 'code',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' を追加します（sync の内部 doc-write エンドポイント）。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'スコープ（権限）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'read',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … 閲覧',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'write_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … PBI・SBI・プロジェクト・スプリント・依存の書き込み',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'write_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … コメント',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'write_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … ページ作成・改名・移動・ゴミ箱・本文編集',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'admin',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' … 全許可',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '使えるツール（31 種・抜粋）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '読み取り：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'get_overview',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_projects',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_sprints',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_pbis',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_sbis',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'get_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'resolve_key',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'search',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'sprint_metrics',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_dependencies',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_comments',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'list_pages',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'get_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'audit_log',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'PM 書き込み：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'create_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_pbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_pbi_status',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'create_sbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_sbi',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'create_project',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_project',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'create_sprint',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_sprint',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'add_dependency',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'remove_dependency',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'コメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'add_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'resolve_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'react_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'delete_comment',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ページ／ドキュメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'create_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'update_page_title',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'move_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'trash_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'restore_page',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'append_doc',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'set_doc',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'GitHub：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: 'link_github_issue',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' / ',
                        type: 'text',
                      },
                      {
                        text: 'unlink_github_issue',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '🔑 ',
                    type: 'text',
                  },
                  {
                    text: '黄金律',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '：MCP ツールは ',
                    type: 'text',
                  },
                  {
                    text: 'ブロック id（ULID）',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' を取ります。',
                    type: 'text',
                  },
                  {
                    text: 'PBI-42',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' のような人間キーは ',
                    type: 'text',
                  },
                  {
                    text: 'synapse_resolve_key',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' で先に解決してください。書き込みツールは Claude Code 側で確認を挟み、全呼び出しは監査ログ（',
                    type: 'text',
                  },
                  {
                    text: 'synapse_audit_log',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' / 設定 → 監査ログ）に残ります。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '「cc で実装」ボタン',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'PBI から headless な Claude Code セッションを起動できます（カード／一覧／詳細の「cc で実装」）。',
                type: 'text',
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '⚠️ ',
                    type: 'text',
                  },
                  {
                    text: '現状はスタブ動作',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: 'です。ローカル／サンドボックス未接続では、',
                    type: 'text',
                  },
                  {
                    text: 'queued → running → succeeded',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' と擬似的に遷移し、ダミーの PR リンクを返します。本番はサンドボックス（Cloudflare Container、',
                    type: 'text',
                  },
                  {
                    text: 'allowedTools',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' は明示 allowlist、資格情報マウントなし、',
                    type: 'text',
                  },
                  {
                    text: '--dangerously-skip-permissions',
                    type: 'text',
                    marks: [
                      {
                        type: 'code',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' 禁止）で実行する設計ですが、実行本体は今後の実装です。',
                    type: 'text',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      key: 'collaboration',
      title: '💬 コラボレーション',
      icon: '📄',
      doc: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '💬 コラボレーション',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE はチームで使う前提。同時編集・コメント・チャット・通知が揃っています。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '同時編集（プレゼンス）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '同じページを開いている人のアバターが並び、接続状態がバッジで分かります。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'オフラインでも編集でき、再接続で自動マージ（Yjs CRDT）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'コメント',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'インラインコメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ',
                        type: 'text',
                      },
                      {
                        text: '本文の範囲を選択し 💬 でコメント。該当箇所がハイライトされます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ブロックコメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI / SBI / ページ等の詳細ページでスレッド型のコメント。返信・絵文字リアクション（',
                        type: 'text',
                      },
                      {
                        text: '👍 🎉 👀 ✅ 🤔',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）・',
                        type: 'text',
                      },
                      {
                        text: '@メンション',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '（名前で解決）に対応。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'チャット',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'サイドバーの 💬 チャットで ',
                        type: 'text',
                      },
                      {
                        text: 'チャンネル型',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'のチームチャット。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'メッセージは ',
                        type: 'text',
                      },
                      {
                        text: '@メンション',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で通知、絵文字リアクション（',
                        type: 'text',
                      },
                      {
                        text: '👍 🎉 👀 ✅ 🤔 ❤️',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）、画像／ファイル添付に対応。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '削除は投稿者本人またはワークスペース管理者。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '※ チャットはメンバー同士のやり取りです（AI は参加しません）。AI への相談はエディタの /ai や =ASK を使ってください。',
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                    attrs: {},
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '通知とメンバー',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'メンションやリマインダーは通知ベルに届きます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'メンバーは ',
                        type: 'text',
                      },
                      {
                        text: 'owner / admin / member',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' のロールで管理（設定 → メンバー）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 1,
            },
            content: [
              {
                text: '💬 コラボレーション',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE はチームで使う前提。同時編集・コメント・チャット・通知が揃っています。',
                type: 'text',
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '同時編集（プレゼンス）',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '同じページを開いている人のアバターが並び、接続状態がバッジで分かります。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'オフラインでも編集でき、再接続で自動マージ（Yjs CRDT）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'コメント',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'インラインコメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' 本文の範囲を選択し 💬 でコメント。',
                        type: 'text',
                      },
                      {
                        text: '該当箇所がハイライトされます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'ブロックコメント：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' PBI / SBI / ページ等の詳細ページでスレッド型のコメント。返信・絵文字リアクション（',
                        type: 'text',
                      },
                      {
                        text: '👍 🎉 👀 ✅ 🤔',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）・',
                        type: 'text',
                      },
                      {
                        text: '@メンション',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '（名前で解決）に対応。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'チャット',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'サイドバーの 💬 チャットで ',
                        type: 'text',
                      },
                      {
                        text: 'チャンネル型',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'のチームチャット。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'メッセージは ',
                        type: 'text',
                      },
                      {
                        text: '@メンション',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で通知、絵文字リアクション（',
                        type: 'text',
                      },
                      {
                        text: '👍 🎉 👀 ✅ 🤔 ❤️',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '）、画像／ファイル添付に対応。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '削除は投稿者本人またはワークスペース管理者。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '※ チャットはメンバー同士のやり取りです（AI は参加しません）。AI への相談はエディタの /ai や =ASK を使ってください。',
                type: 'text',
                marks: [
                  {
                    type: 'italic',
                    attrs: {},
                  },
                ],
              },
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: '通知とメンバー',
                type: 'text',
              },
            ],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'メンションやリマインダーは通知ベルに届きます。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: 'メンバーは ',
                        type: 'text',
                      },
                      {
                        text: 'owner / admin / member',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' のロールで管理（設定 → メンバー）。',
                        type: 'text',
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};
