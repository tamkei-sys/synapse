/**
 * `/image` slash command (PBI-39)。
 *
 * file picker を開いて画像を選択 → uploadImage（dev: data-URL）→ Image
 * ノードを挿入する。
 */
import type { SlashCommand } from './slash-menu.js';
import { uploadImage } from './image-upload.js';

export function makeImageSlashCommand(): SlashCommand {
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
        void uploadImage(file).then((src) => {
          if (src) editor.chain().focus().setImage({ src }).run();
        });
      };
      input.click();
    },
  };
}
