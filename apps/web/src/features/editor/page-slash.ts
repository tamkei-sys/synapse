/**
 * `/page` slash command factory (PBI-34).
 *
 * Notion 風: ドキュメントの中に「子ページ」を生やす。
 *
 *   1. `/page` でメニュー → 選択するとプロンプトで「タイトル」を聞く（空なら無題）
 *   2. block.createPage を parentPageId 付きで叩く
 *   3. 返ってきた id を pageRef ノードとして挿入
 *
 * `parentPageId` は editor を載せている side が渡す。/p/$pageId にいる
 * ときはそのページが親、それ以外 (/b/$blockId 等) では未指定にして
 * トップレベルページを作る。
 */
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makePageSlashCommand(workspaceId: string, parentPageId?: string): SlashCommand {
  return {
    id: 'page',
    title: '新規サブページ',
    description: 'ドキュメント内に新しいページを作成してリンク',
    keywords: ['page', 'ページ', 'subpage', 'サブページ', 'doc'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const title = window.prompt('新しいページのタイトル', '無題のページ');
      if (title === null) return; // キャンセル
      const trimmed = title.trim() || '無題のページ';
      void trpc.block.createPage
        .mutate({
          workspaceId,
          title: trimmed,
          ...(parentPageId ? { parentPageId } : {}),
        })
        .then((created) => {
          editor.chain().focus().insertPageRef(created.id, trimmed).run();
        });
    },
  };
}
