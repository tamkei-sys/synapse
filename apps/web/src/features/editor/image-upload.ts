/**
 * 画像アップロード (PBI-39)。
 *
 * dev: 選択/ドロップ/ペーストした画像を data-URL に変換してそのまま
 * Image ノードの src にする（外部ストレージ不要で動線が完結する）。
 * 本番: `uploadImage` を R2 アップロード → 公開 URL を返す実装に差し替える
 * （seam はこの関数 1 箇所）。data-URL は Yjs doc を肥大化させるので
 * 2MB を上限にする。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

export function fileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null);
  if (file.size > MAX_BYTES) {
    window.alert('画像は 2MB 以下にしてください（dev の data-URL 制限）。');
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * 本番でここを R2 アップロードに差し替える。今は data-URL を返すだけ。
 *   const { url } = await trpc.media.upload.mutate(...) のように。
 */
export async function uploadImage(file: File): Promise<string | null> {
  return fileToDataUrl(file);
}

/**
 * 画像のドロップ / ペーストをハンドルする拡張。Image ノード（@tiptap/
 * extension-image）と併用する。
 */
export const ImageDropPasteExtension = Extension.create({
  name: 'imageDropPaste',

  addProseMirrorPlugins() {
    const editor = this.editor;
    const insert = async (files: File[]) => {
      for (const file of files) {
        const src = await uploadImage(file);
        if (src) editor.chain().focus().setImage({ src }).run();
      }
    };
    return [
      new Plugin({
        key: new PluginKey('synapse-image-drop-paste'),
        props: {
          handlePaste: (_view, event) => {
            const files = Array.from(event.clipboardData?.files ?? []).filter((f) =>
              f.type.startsWith('image/'),
            );
            if (files.length === 0) return false;
            event.preventDefault();
            void insert(files);
            return true;
          },
          handleDrop: (_view, event) => {
            const files = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
              f.type.startsWith('image/'),
            );
            if (files.length === 0) return false;
            event.preventDefault();
            void insert(files);
            return true;
          },
        },
      }),
    ];
  },
});
