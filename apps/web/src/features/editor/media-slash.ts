/**
 * `/video` `/audio` slash commands (PBI-41)。
 *
 * file picker（video/* または audio/*）→ uploadFile（dev: data-URL）→
 * Video/Audio ノードを挿入する。アップロード seam はファイル添付 (PBI-40) を
 * そのまま再利用する。
 */
import { uploadFile } from './file-upload.js';
import type { SlashCommand } from './slash-menu.js';

function pickAndInsert(accept: string, insert: (src: string) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    void uploadFile(file).then((uploaded) => {
      if (uploaded) insert(uploaded.href);
    });
  };
  input.click();
}

export function makeVideoSlashCommand(): SlashCommand {
  return {
    id: 'video',
    title: '動画',
    description: '動画をアップロードして埋め込み',
    keywords: ['video', '動画', 'mp4', 'movie', 'ムービー'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      pickAndInsert('video/*', (src) => editor.chain().focus().setVideo({ src }).run());
    },
  };
}

export function makeAudioSlashCommand(): SlashCommand {
  return {
    id: 'audio',
    title: '音声',
    description: '音声をアップロードして埋め込み',
    keywords: ['audio', '音声', 'mp3', 'sound', 'オーディオ', '音'],
    run: (editor, range) => {
      editor.chain().focus().deleteRange(range).run();
      pickAndInsert('audio/*', (src) => editor.chain().focus().setAudio({ src }).run());
    },
  };
}
