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
  title: 'SYNAPSE の使い方ガイド',
  icon: '🧭',
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
            text: '🧭 SYNAPSE の使い方ガイド',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: 'SYNAPSE（シナプス）は、チームの「書きもの」「やることの管理」「数字の表」を、ひとつの場所にまとめて使える道具です。',
            type: 'text',
          },
        ],
      },
      {
        type: 'paragraph',
        content: [
          {
            text: 'メモも、計画も、進み具合も、ぜんぶここに置けます。「あの資料どこだっけ？」を減らすための場所、と思ってください。',
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
                text: '💡 いま読んでいるこの説明書も、SYNAPSE の「ページ」です。読みながらそのまま真似できます。',
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
            text: 'この説明書の読み方',
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
                    text: '上から順に読む必要はありません。やりたいことのページだけ開けば大丈夫です。',
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
                    text: '初めての方は、次の「🔰 まずはここから」だけ読めば使い始められます。',
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
                    text: '左の一覧（このページの下にも並んでいます）から、各ページを開けます。',
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
            text: '各ページの案内',
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
                        text: 'ページ',
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
                        text: '🔰 まずはここから',
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
                        text: '入り方・画面の見方・はじめての1ページ',
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
                        text: '✏️ ページに文章を書く',
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
                        text: '文字の飾り・表や写真の入れ方',
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
                        text: '🗂️ ページの整理と便利機能',
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
                        text: '並べ替え・ひな形・昔の状態に戻す・ゴミ箱',
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
                        text: '✅ 仕事の管理（やること表）',
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
                        text: 'やることカードの作り方と動かし方',
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
                        text: '🧮 計算表',
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
                        text: '数字の表と合計の出し方',
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
                        text: '🗃️ 一覧表（データベース）',
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
                        text: '名簿や記録など、同じ項目で並べる情報',
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
                        text: '🤖 AI に手伝ってもらう',
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
                        text: '文章の下書き・要約・書き直し',
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
                        text: '💬 みんなで使う',
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
                        text: '同時に書く・コメント・連絡・仲間を招く',
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
                        text: '🔧 開発者向け機能',
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
                        text: 'システム開発の担当者向け（読み飛ばしてOK）',
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
            text: '困ったときは',
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
                    text: '画面左下の ',
                    type: 'text',
                  },
                  {
                    text: '📖 使い方',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' に、いつでも見られる短い手引きがあります。',
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
                    text: 'それでも分からないときは、この場所に招待してくれた人（管理者）に聞いてください。',
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
                    text: '操作をまちがえても大丈夫。たいていのことは',
                    type: 'text',
                  },
                  {
                    text: '元に戻せます',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: '（→「🗂️ ページの整理と便利機能」）。',
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
  children: [
    {
      key: 'getting-started',
      title: 'まずはここから',
      icon: '🔰',
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
                text: '🔰 まずはここから',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE に入って、最初の1ページを作るまでを案内します。5分くらいでできます。',
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
                text: '1. 入る',
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
                        text: '案内された住所（URL）をブラウザで開きます。',
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
                        text: 'はじめての人は ',
                        type: 'text',
                      },
                      {
                        text: '「新規登録」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押して、名前・メールアドレス・パスワード（8文字以上）を入れます。',
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
                        text: '2回目からは ',
                        type: 'text',
                      },
                      {
                        text: '「ログイン」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' にメールアドレスとパスワードを入れるだけです。',
                        type: 'text',
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
                    text: '💡 パスワードを忘れないようにご注意ください。',
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
                text: '2. 画面の見方',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '画面の左に、縦に細長い案内板があります。上から順に：',
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
                        text: '作業場所の名前',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — いまいる「みんなの作業場所（ワークスペース）」の名前です。',
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
                        text: '検索',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' と ',
                        type: 'text',
                      },
                      {
                        text: '🔔 お知らせ',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — 探しもの・自分宛ての連絡はここ。',
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
                        text: 'プロジェクト / スプリント / PBI / SBI / チャット',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — 仕事の管理と連絡（あとのページで説明します）。',
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
                        text: ' — 作った文書の一覧。ここが書きものの本棚です。',
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
                        text: '設定・ゴミ箱・使い方',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — いちばん下にまとまっています。',
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
                text: '3. はじめての1ページ',
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
                        text: '左の「ページ」の横にある ',
                        type: 'text',
                      },
                      {
                        text: '＋',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押します。',
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
                        text: '新しいページが開くので、いちばん上に題名を打ちます（例：自己紹介）。',
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
                        text: 'その下の白いところを押して、ふつうに文章を書きます。',
                        type: 'text',
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
                    text: '💡 保存ボタンはありません。',
                    type: 'text',
                  },
                  {
                    text: '書いたそばから自動で保存されます。',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' そのまま画面を閉じても消えません。',
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
                text: '4. 探す',
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
                        text: '左上の ',
                        type: 'text',
                      },
                      {
                        text: '検索',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押すと、ページや仕事のカードをまとめて探せます。',
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
                        text: 'キーボードの ',
                        type: 'text',
                      },
                      {
                        text: 'Ctrl',
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
                        text: 'K',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を同時に押しても開きます（Mac は ',
                        type: 'text',
                      },
                      {
                        text: '⌘',
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
                        text: 'K',
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
            ],
          },
          {
            type: 'heading',
            attrs: {
              level: 2,
            },
            content: [
              {
                text: 'よく使うキー操作（覚えなくても大丈夫）',
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
                            text: 'はたらき',
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
                            text: 'Ctrl + K',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '（Mac: ',
                            type: 'text',
                          },
                          {
                            text: '⌘ + K',
                            type: 'text',
                            marks: [
                              {
                                type: 'code',
                                attrs: {},
                              },
                            ],
                          },
                          {
                            text: '）',
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
                            text: '検索を開く',
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
                            text: 'Ctrl + Z',
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
                            text: 'ひとつ前に戻す（書きまちがいの取り消し）',
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
                            text: 'Ctrl + B',
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
                            text: '選んだ文字を太字にする',
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
                            text: '開いている小窓を閉じる',
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
        ],
      },
    },
    {
      key: 'docs-editor',
      title: 'ページに文章を書く',
      icon: '✏️',
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
                text: '✏️ ページに文章を書く',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'ページは、ノートの1枚のようなものです。文章のほかに、表・写真・チェックの一覧なども置けます。',
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
                text: '文字を飾る',
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
                        text: '飾りたい文字を',
                        type: 'text',
                      },
                      {
                        text: 'なぞって選ぶ',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'と、小さなボタンが浮かびます。',
                        type: 'text',
                      },
                      {
                        text: 'B',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で太字、',
                        type: 'text',
                      },
                      {
                        text: 'I',
                        type: 'text',
                        marks: [
                          {
                            type: 'italic',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で斜め文字、下線・取り消し線もここから。',
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
                        text: '本文の上にも同じボタンが並んでいます。どちらを使っても同じです。',
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
                        text: '章の見出しにしたい行は ',
                        type: 'text',
                      },
                      {
                        text: 'H1・H2・H3',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押します（数字が大きいほど小さな見出し）。',
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
                text: '「/」で部品を呼び出す',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '本文で ',
                type: 'text',
              },
              {
                text: '「/」（スラッシュ）',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' を打つと、入れられる部品の一覧が出ます。よく使うのはこのあたり：',
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
                            text: '部品',
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
                            text: '使いどころ',
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
                            text: '箇条書き・番号付き',
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
                            text: '要点を並べる・手順を書く',
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
                            text: 'チェックの一覧',
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
                            text: 'やることの確認（押すと ✓ が付きます）',
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
                            text: '表',
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
                            text: '行と列で整理したいとき',
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
                            text: 'ほかの資料からの抜き書き',
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
                            text: '話題の切り替え',
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
                            text: '画像・ファイル',
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
                            text: '写真や資料を貼る',
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
                            text: '長いページの見出し一覧を自動で作る',
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
                    text: '💡 一覧にはもっとたくさん部品があります。気になるものを試してみてください。失敗しても Ctrl + Z で戻せます。',
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
                text: '別のページへの案内を貼る',
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
                        text: '本文で ',
                        type: 'text',
                      },
                      {
                        text: '「@」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を打ってページ名を選ぶと、そのページへの',
                        type: 'text',
                      },
                      {
                        text: '案内（リンク）',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'が入ります。押すと相手のページに飛べます。',
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
                        text: '案内された側のページの下には「このページはどこから案内されているか」が自動で並びます。',
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
                text: '表のあつかい',
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
                        text: '表の中を押すと、行や列を増やす・減らすボタンが上に出ます。',
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
                        text: 'マスの中はふつうの文章と同じように書けます。',
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
                text: '印刷・書き出し・取り込み',
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
                        text: '印刷したい・PDF にしたい',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — 本文の上の ',
                        type: 'text',
                      },
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
                        text: ' を押すと印刷画面が開きます。',
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
                        text: 'ほかの道具で作った文書を入れたい',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' — ',
                        type: 'text',
                      },
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
                        text: ' から文書ファイルを選びます。',
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
                        text: 'そのほか、文書を丸ごとファイルとして手元に保存することもできます（⬇️ のボタン）。',
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
      key: 'page-ops',
      title: 'ページの整理と便利機能',
      icon: '🗂️',
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
                text: '🗂️ ページの整理と便利機能',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'ページが増えてきたら、この機能で片づきます。どれもページの上に並ぶボタンか、左の一覧から使えます。',
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
                text: '並べ替えと親子',
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
                        text: '左の一覧でページ名を',
                        type: 'text',
                      },
                      {
                        text: '押したまま上下に動かす',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'と、順番を入れ替えられます。',
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
                        text: 'ページ名に重ねて離すと、そのページの',
                        type: 'text',
                      },
                      {
                        text: '中（子ページ）',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'に入ります。書類をフォルダーにしまうイメージです。',
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
                text: 'お気に入り',
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
                        text: 'よく開くページは、ページ右上の ',
                        type: 'text',
                      },
                      {
                        text: '☆',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押しておきましょう。左の「お気に入り」にいつも表示されます。',
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
                text: 'ひな形（テンプレート）',
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
                        text: '同じ形の文書を何度も作るなら、ひな形が便利です。',
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
                        text: '左の「ページ」の横の ',
                        type: 'text',
                      },
                      {
                        text: '📋',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' から、',
                        type: 'text',
                      },
                      {
                        text: '用意されているひな形',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '（作業計画書・議事録など8種類）を選べます。',
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
                        text: '自分のページをひな形にしたいときは、ページ上部の ',
                        type: 'text',
                      },
                      {
                        text: '📋 テンプレートとして保存',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押します。',
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
                text: '昔の状態に戻す（履歴）',
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
                        text: 'ページ上部の ',
                        type: 'text',
                      },
                      {
                        text: '🕐 履歴',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押します。',
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
                        text: '日時の一覧から、戻したい時点を選びます。',
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
                        text: '中身を確かめて「この版に戻す」を押せば完了です。',
                        type: 'text',
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
                    text: '💡 「まちがって消しちゃった！」も、履歴から戻せることが多いです。あわてなくて大丈夫。',
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
                text: '外部の人に見せる（共有）',
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
                        text: 'ページ上部の ',
                        type: 'text',
                      },
                      {
                        text: '🔗 共有',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' から、',
                        type: 'text',
                      },
                      {
                        text: '見るだけの案内（URL）',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'を作れます。',
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
                        text: 'この案内を知っている人は、ログインしなくてもそのページを見られます。社外に送る前に、見せてよい内容か確認しましょう。',
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
                text: 'お知らせの予約（リマインダー）',
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
                        text: 'ページ上部の ',
                        type: 'text',
                      },
                      {
                        text: '⏰ リマインダー',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で日時を決めると、その時刻に ',
                        type: 'text',
                      },
                      {
                        text: '🔔',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' へお知らせが届きます。',
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
                        text: '「金曜にこのページを見返す」のような使い方ができます。',
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
                text: '捨てる・戻す（ゴミ箱）',
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
                        text: 'いらないページは、ページ上部の ',
                        type: 'text',
                      },
                      {
                        text: '🗑️ ゴミ箱',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' へ。',
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
                        text: 'まちがえて捨てても、左下の ',
                        type: 'text',
                      },
                      {
                        text: 'ゴミ箱',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' からいつでも戻せます。',
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
                        text: 'ゴミ箱に入れて30日たつと、自動で完全に消えます。',
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
      key: 'project-management',
      title: '仕事の管理（やること表）',
      icon: '✅',
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
                text: '✅ 仕事の管理（やること表）',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE では、仕事を「カード」にして管理します。ホワイトボードに付箋を貼って、終わったら隣に動かす——あの感覚です。',
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
                text: '4つの入れ物',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '画面の左に4つの言葉が並んでいます。大きい順にこういう関係です：',
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
                            text: '名前',
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
                            text: 'たとえると',
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
                            text: '例',
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
                            text: 'プロジェクト',
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
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '大きな目標の箱',
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
                            text: '「新店舗の立ち上げ」',
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
                            text: 'スプリント',
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
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: '2週間ごとの区切り',
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
                            text: '「今月前半にやる分」',
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
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'やることカード',
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
                            text: '「チラシの原稿を作る」',
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
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [
                          {
                            text: 'カードを割った作業メモ',
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
                            text: '「写真を選ぶ」「文面を書く」',
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
                    text: '💡 ぜんぶ覚えなくて大丈夫。まずは',
                    type: 'text',
                  },
                  {
                    text: '「PBI ＝ やることカード」',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: 'だけ覚えれば使えます。',
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
                text: 'カードを作る',
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
                        text: '左の ',
                        type: 'text',
                      },
                      {
                        text: 'PBI',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押します。',
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
                        text: '＋ 新規',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押して、やることを短く書きます（例：チラシの原稿を作る）。',
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
                text: 'カードの状態を動かす',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'カードには「いまどの段階か」の印が付きます。左から右へ進んでいきます：',
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
                            text: '画面の表示',
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
                            text: '意味',
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
                            text: 'backlog',
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
                            text: 'やる予定（まだ手を付けない）',
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
                            text: 'ready',
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
                            text: '準備ができた（次にやる）',
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
                            text: 'in_progress',
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
                            text: 'いま作業中',
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
                            text: 'review',
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
                            text: 'できたので確認待ち',
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
                            text: 'done',
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
                            text: '完了！',
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
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        text: '表示を',
                        type: 'text',
                      },
                      {
                        text: '「カンバン」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'に切り替えると、状態ごとの列にカードが並びます。カードを',
                        type: 'text',
                      },
                      {
                        text: '押したまま隣の列へ動かす',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: 'だけで状態が変わります。',
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
                text: 'カードの中身',
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
                        text: 'カードを押して開くと、期限・担当者・優先度を選べます。',
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
                        text: 'カードの中はふつうのページと同じように文章が書けます。メモや相談ごとはそのまま書いておきましょう。',
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
                        text: 'カードにはコメントも付けられます（→「💬 みんなで使う」）。',
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
                text: '進み具合を見る',
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
                        text: 'スプリント',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' の画面を開くと、「あとどれくらい残っているか」のグラフと「何枚中何枚終わったか」が見られます。',
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
                        text: '長く動きのないカードには「停滞」の印が自動で付くので、声かけのきっかけになります。',
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
      key: 'spreadsheet',
      title: '計算表（スプレッドシート）',
      icon: '🧮',
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
                text: '🧮 計算表（スプレッドシート）',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'ページの中に、数字の計算ができる表を置けます。集計表や簡単な見積もりに便利です。',
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
                text: '作る',
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
                        text: '本文で ',
                        type: 'text',
                      },
                      {
                        text: '「/」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を打ち、一覧から ',
                        type: 'text',
                      },
                      {
                        text: 'sheet（スプレッドシート）',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を選びます。',
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
                        text: 'マス（セル）を押して、数字や文字を入れます。',
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
                text: '合計などの計算',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'マスに ',
                type: 'text',
              },
              {
                text: '「=」で始まる式',
                type: 'text',
                marks: [
                  {
                    type: 'bold',
                    attrs: {},
                  },
                ],
              },
              {
                text: ' を打つと、計算した答えが表示されます：',
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
                            text: '打ち方',
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
                            text: '意味',
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
                            text: '=SUM(A1:A10)',
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
                            text: 'A の列の 1〜10 行目を合計する',
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
                            text: '=AVERAGE(A1:A10)',
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
                            text: '同じ範囲の平均を出す',
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
                            text: '=A1*B1',
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
                            text: 'A1 と B1 のかけ算',
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
                    text: '💡 「A1」はマスの住所です。横の列がアルファベット、縦の行が数字。左上のマスが A1 です。',
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
                text: 'AI に聞くマス',
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
                        text: 'マスに ',
                        type: 'text',
                      },
                      {
                        text: '=ASK("質問")',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' と打つと、AI の答えがそのマスに出ます。',
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
                        text: '例：',
                        type: 'text',
                      },
                      {
                        text: '=ASK("この表の数字を一言でまとめて")',
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
        ],
      },
    },
    {
      key: 'database',
      title: '一覧表（データベース）',
      icon: '🗃️',
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
                text: '🗃️ 一覧表（データベース）',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '「同じ項目で情報を並べたい」ときの表です。会員名簿、備品の管理、問い合わせの記録などに向いています。',
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
                    text: '💡 計算表との違い：計算表は「数字の計算」が得意。一覧表は「項目をそろえて情報を管理する」のが得意です。',
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
                text: '作る',
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
                        text: '本文で ',
                        type: 'text',
                      },
                      {
                        text: '「/」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を打ち、一覧から ',
                        type: 'text',
                      },
                      {
                        text: 'db（データベース）',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を選びます。',
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
                        text: '＋ 列',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で項目を増やします。項目の種類は、文字・数字・チェック・選択肢・日付などから選べます。',
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
                        text: '＋ 行を追加',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' で1件ずつ増やしていきます。',
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
                text: '見え方を切り替える',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: '同じ中身を、5通りの見え方で表示できます：',
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
                            text: '見え方',
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
                            text: '向いている場面',
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
                            text: 'ふつうの表。その場で書き換えられます',
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
                            text: '「選択肢」の項目ごとに札を並べる（例：対応中／完了）',
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
                            text: '1件ずつカードで眺める',
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
                            text: '「日付」の項目をこよみに並べる',
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
                            text: '入力欄だけの画面で1件ずつ足す（記入用紙のイメージ）',
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
                text: '絞り込みと並び替え',
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
                        text: '「ステータスが対応中のものだけ」のように、条件で絞り込めます。',
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
                        text: '日付順・名前順などの並び替えもできます。',
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
      title: 'AI に手伝ってもらう',
      icon: '🤖',
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
                text: '🤖 AI に手伝ってもらう',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE には、文章の下書きや要約を手伝ってくれる AI（人工知能）が入っています。難しい設定はいりません。',
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
                text: '文章を書いてもらう',
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
                        text: '本文で ',
                        type: 'text',
                      },
                      {
                        text: '「/ai」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' と打ちます。',
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
                        text: 'お願いごとを書きます（例：「保護者向けのお知らせ文を、ていねいな言葉で書いて」）。',
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
                        text: 'できあがった文章が、その場に入ります。気に入らなければ消して書き直してもらえます。',
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
                text: '文章を直してもらう',
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
                        text: '直したい文章を',
                        type: 'text',
                      },
                      {
                        text: 'なぞって選びます',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
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
                        text: '浮かんだボタンの ',
                        type: 'text',
                      },
                      {
                        text: '✨AI',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押します。',
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
                        text: '要約',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '（短くまとめる）・',
                        type: 'text',
                      },
                      {
                        text: '翻訳',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '・',
                        type: 'text',
                      },
                      {
                        text: '書き換え',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '（言い回しを変える）から選びます。',
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
                text: 'ページの要点を作ってもらう',
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
                        text: 'ページ右上の ',
                        type: 'text',
                      },
                      {
                        text: '📑 情報',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を開いて ',
                        type: 'text',
                      },
                      {
                        text: '要点 (AI)',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押すと、本文のまとめ（3〜5行）を作って覚えておいてくれます。',
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
                        text: '長い議事録の「結局なにが決まったの？」に便利です。',
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
                text: '計算表から聞く',
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
                        text: '計算表のマスに ',
                        type: 'text',
                      },
                      {
                        text: '=ASK("質問")',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' と打つ使い方もあります（→「🧮 計算表」）。',
                        type: 'text',
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
                    text: '⚠️ ',
                    type: 'text',
                  },
                  {
                    text: 'AI の文章は、まちがうことがあります。',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: ' 日付・名前・金額などの大事な内容は、必ず人の目で確かめてから使ってください。',
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
      title: 'みんなで使う',
      icon: '💬',
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
                text: '💬 みんなで使う',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE はみんなで同時に使う前提で作られています。書く・話す・知らせる、が全部そろっています。',
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
                text: '同時に書ける',
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
                        text: '同じページを何人かで同時に開いて、同時に書けます。上書きで消し合う心配はありません。',
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
                        text: 'いま誰が同じページを見ているかは、ページ上部の顔印で分かります。',
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
                        text: '電波が切れても書き続けられます。つながったときに自動でまとまります。',
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
                text: 'コメントで質問・指摘',
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
                        text: '気になる文章を',
                        type: 'text',
                      },
                      {
                        text: 'なぞって選び',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: '、浮かんだ ',
                        type: 'text',
                      },
                      {
                        text: '💬',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を押します。',
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
                        text: '質問や指摘を書きます。該当の場所に印が付きます。',
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
                        text: '相手は返信ができて、解決したら「解決済み」にできます。',
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
                text: '連絡を取り合う（チャット）',
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
                        text: '左の ',
                        type: 'text',
                      },
                      {
                        text: '💬 チャット',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' は、その場の連絡用です。話題ごとの部屋（チャンネル）に分かれています。',
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
                        text: '文中で ',
                        type: 'text',
                      },
                      {
                        text: '「@相手の名前」',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' と書くと、その人の ',
                        type: 'text',
                      },
                      {
                        text: '🔔',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' にお知らせが届きます。',
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
                        text: '絵文字での反応（👍 など）や、画像・ファイルの添付もできます。',
                        type: 'text',
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
                    text: '💡 使い分けの目安：残したい内容は「ページ」や「カード」に、その場の連絡は「チャット」に。',
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
                text: 'お知らせ（通知）',
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
                        text: '自分宛ての呼びかけや、予約したお知らせは、左上の ',
                        type: 'text',
                      },
                      {
                        text: '🔔',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' にたまります。',
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
                        text: '数字が付いていたら、未読がある印です。',
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
                text: '仲間を招く',
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
                        text: '左下の ',
                        type: 'text',
                      },
                      {
                        text: '設定 → メンバー',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を開きます。',
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
                        text: '「招待」から相手のメールアドレスを入れて、案内を送ります。',
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
                        text: '役割を選びます：ふだん使う人は「member」、人の出入りや設定を管理する人は「admin / owner」。',
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
      key: 'github',
      title: '開発者向け機能（GitHub・Claude Code）',
      icon: '🔧',
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
                text: '🔧 開発者向け機能（GitHub・Claude Code）',
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
                    text: 'このページは',
                    type: 'text',
                  },
                  {
                    text: 'システム開発の担当者向け',
                    type: 'text',
                    marks: [
                      {
                        type: 'bold',
                        attrs: {},
                      },
                    ],
                  },
                  {
                    text: 'です。開発に関わらない方は読み飛ばして大丈夫です。ここから先は専門用語をそのまま使います。',
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
                text: 'GitHub 連携',
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
                        text: 'Issue リンク：',
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
                        text: '（owner / repo / issue 番号）。',
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
                        text: ' PBI のタイトル／ステータス変更をリンク済み Issue へ反映（',
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
                        text: '）。サーバ側に GitHub トークン設定が必要。',
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
                        text: ' GitHub Webhook（issues イベント）で Issue 編集 → タイトル反映、close → done、reopen → backlog。',
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
                        text: 'セキュリティ：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' Webhook は ',
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
                        text: ' の HMAC 検証必須、',
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
                        text: '未実装：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' Issue 自動生成・ブランチ自動作成・PR / CI イベントの本処理。',
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
                text: 'Claude Code & MCP サーバー',
                type: 'text',
              },
            ],
          },
          {
            type: 'paragraph',
            content: [
              {
                text: 'SYNAPSE には Claude Code から操作するための MCP サーバー（stdio）が同梱されています。',
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
                        text: '「設定 → API トークン」でワークスペース用トークンを発行（表示は作成時の一度だけ）。',
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
                        text: 'リポジトリ直下に ',
                        type: 'text',
                      },
                      {
                        text: '.mcp.json',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を作成（トークンを含むため必ず gitignore）。',
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
                        text: 'Claude Code で ',
                        type: 'text',
                      },
                      {
                        text: '/mcp',
                        type: 'text',
                        marks: [
                          {
                            type: 'code',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' を実行し、synapse サーバーを承認。',
                        type: 'text',
                      },
                    ],
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
                        text: 'ツール：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' 読み取り／PM 書き込み／コメント／ページ・本文編集／GitHub リンクなど 31 種。',
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
                        text: '黄金律：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' ツールはブロック id（ULID）を取る。',
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
                        text: ' で先に解決。',
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
                        text: '本文編集：',
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
                        text: ' / ',
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
                        text: ' は sync の内部 doc-write API 経由（',
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
                        text: ' / ',
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
                        text: ' が必要）。',
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
                        text: '監査：',
                        type: 'text',
                        marks: [
                          {
                            type: 'bold',
                            attrs: {},
                          },
                        ],
                      },
                      {
                        text: ' 全ツール呼び出しは監査ログに記録（設定 → 監査ログ、または ',
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
                        text: 'スコープ：',
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
                        text: 'read / write_pbi / write_comment / write_page / admin',
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
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    text: '⚠️ PBI の「cc で実装」ボタンは現状スタブ動作（queued → running → succeeded の擬似遷移）。本実行はサンドボックス前提で今後実装。',
                    type: 'text',
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
