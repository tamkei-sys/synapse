/**
 * `/file` slash command (PBI-40)。
 *
 * file picker（全種別）を開いてファイルを選択 → uploadFile（dev: data-URL）→
 * FileNode を挿入する。動線は image-slash と同型。
 */
import { uploadFile } from './file-upload.js';
import type { SlashCommand } from './slash-menu.js';

export function makeFileSlashCommand(): SlashCommand {
  return {
    id: 'file',
    title: 'ファイル',
    description: 'ファイルを添付（ダウンロード可能）',
    keywords: ['file', 'ファイル', '添付', 'attach', 'attachment', 'document', '資料'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        void uploadFile(file).then((uploaded) => {
          if (uploaded) editor.chain().focus().setFile(uploaded).run();
        });
      };
      input.click();
    },
  };
}
