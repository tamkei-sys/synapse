/**
 * `/db` slash command factory。
 *
 * /help（使い方マニュアル）の「『/db』で任意スキーマのデータベースを作成できます」
 * という記載に合わせる導線。/sheet がシートを本文に埋め込むのと同型に、db.create で
 * 作成した DB を dbEmbed ノードとして本文にその場で埋め込み、テーブル/ボード/フォーム等を
 * インライン操作できるようにする。
 */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makeDbSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'db',
    title: '新規データベース',
    description: '任意スキーマの DB を本文に埋め込み',
    keywords: ['db', 'database', 'データベース', 'テーブル', 'table', '一覧', 'コレクション'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      void trpc.db.create.mutate({ workspaceId, title: '無題のデータベース' }).then((row) => {
        editor.chain().focus().insertDbEmbed(row.id).run();
      });
    },
  };
}
