/**
 * `/bookmark` slash command (PBI-42)。
 *
 * URL をプロンプトで受け取り、bookmark.fetch (サーバ側 OG 取得 + SSRF 対策) で
 * メタを取得して BookmarkNode を挿入する。到達不能・タイムアウトはサーバが
 * 最小カード (title=ホスト名) を返すので then に入る。SSRF 拒否・不正 URL は
 * BAD_REQUEST で catch に入り、カードは置かずに通知する。
 */
import type { BookmarkAttrs } from './bookmark-node.js';
import type { SlashCommand } from './slash-menu.js';
import { trpc } from '../../lib/trpc.js';

export function makeBookmarkSlashCommand(): SlashCommand {
  return {
    id: 'bookmark',
    title: 'ブックマーク',
    description: 'URL の OG プレビューをカードで挿入',
    keywords: ['bookmark', 'ブックマーク', 'link', 'リンク', 'url', 'og', 'preview', 'プレビュー'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const url = window.prompt('ブックマークする URL', 'https://');
      if (!url || url.trim() === '' || url.trim() === 'https://') return;
      void trpc.bookmark.fetch
        .query({ url: url.trim() })
        .then((meta: BookmarkAttrs) => {
          editor.chain().focus().setBookmark(meta).run();
        })
        .catch(() => {
          window.alert('このURLのプレビューを取得できませんでした');
        });
    },
  };
}
