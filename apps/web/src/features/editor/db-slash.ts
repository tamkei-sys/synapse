/**
 * `/db` slash command factory。
 *
 * /help（使い方マニュアル）の「『/db』で任意スキーマのデータベースを作成できます」
 * という記載に合わせる導線。/sheet がシートを本文に埋め込むのに対し、DB は専用
 * 詳細ページ (/b/$id) で扱う設計なので、ここでは db.create で作成し、本文にその DB へ
 * のリンクを挿入する（page-slash が pageRef を挿すのと同じ「作って参照を置く」流儀。
 * DB 専用 ref ノードは未導入なので汎用リンクで表現＝ProseMirror schema 不変）。
 */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makeDbSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'db',
    title: '新規データベース',
    description: '任意スキーマの DB を作成してリンク',
    keywords: ['db', 'database', 'データベース', 'テーブル', 'table', '一覧', 'コレクション'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const title = window.prompt('新しいデータベースの名前', '無題のデータベース');
      if (title === null) return; // キャンセル
      const trimmed = title.trim() || '無題のデータベース';
      void trpc.db.create.mutate({ workspaceId, title: trimmed }).then((row) => {
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: `📚 ${trimmed}`,
                marks: [{ type: 'link', attrs: { href: `/b/${row.id}` } }],
              },
            ],
          })
          .run();
      });
    },
  };
}
