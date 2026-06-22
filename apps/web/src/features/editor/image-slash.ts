/**
 * `/image` slash command (PBI-39 / PBI-178)。
 *
 * file picker を開いて画像を選択 → uploadImage (R2 or data:URL fallback)
 * → Image ノードを挿入する。workspaceId は呼び出し元 (editor.tsx) から
 * クロージャで受け取る。
 */
import type { SlashCommand } from './slash-menu.js';
import { uploadImage } from './image-upload.js';

export function makeImageSlashCommand(workspaceId: string): SlashCommand {
  return {
    id: 'image',
    title: '画像',
    description: '画像をアップロードして挿入',
    keywords: ['image', '画像', 'img', 'photo', 'picture', '写真'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return;
        void uploadImage(file, workspaceId).then((src) => {
          if (src) editor.chain().focus().setImage({ src }).run();
        });
      };
      input.click();
    },
  };
}
