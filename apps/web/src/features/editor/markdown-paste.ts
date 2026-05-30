/**
 * Markdown paste をハンドリングする TipTap 拡張 (PBI-33)。
 *
 * 設計判断:
 *   - 既定では「HTML をクリップボードに持つ paste」は触らない（ProseMirror
 *     のデフォルト動作で十分整形される）。
 *   - 「プレーンテキストだけ」のときに `looksLikeMarkdown()` で判定して
 *     Markdown っぽければ HTML に変換してから貼る。
 *   - 単一行プレーンテキストは何もしない（コードのコピペで `**` を含んだ
 *     ケースを破壊しない）。
 *
 *   - shift+paste で「強制プレーン貼り」したいケースのために、event の
 *     `clipboardData.types` に html が居ても明示的に MD パースしてほしい
 *     ときは将来 `forceMarkdown` オプションを追加する余地を残す。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { looksLikeMarkdown, markdownToHtml } from './markdown.js';

export const MarkdownPasteExtension = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    const editor = this.editor;
    return [
      new Plugin({
        key: new PluginKey('synapse-markdown-paste'),
        props: {
          handlePaste: (_view, event) => {
            const cb = event.clipboardData;
            if (!cb) return false;
            // HTML が含まれていれば TipTap デフォルトに任せる。
            if (cb.types.includes('text/html')) return false;
            const text = cb.getData('text/plain');
            if (!text) return false;
            if (!looksLikeMarkdown(text)) return false;
            event.preventDefault();
            const html = markdownToHtml(text);
            editor.commands.insertContent(html);
            return true;
          },
        },
      }),
    ];
  },
});
