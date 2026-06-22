/**
 * 画像アップロード (PBI-39 / PBI-178)。
 *
 * 選択 / ドロップ / ペーストした画像を base64 化して tRPC media.upload に
 * 投げる。R2 binding が configure されていれば API は R2 に put して永続
 * URL を返し、未配線な dev 環境では同じ procedure が data:URL を返す
 * (apps/api/src/routers/media.ts の env-based seam)。API が落ちている等
 * fetch 自体が失敗した場合のみ、最後の砦としてクライアントで data:URL を
 * 合成する。
 *
 * 上限はクライアント側で 2MB（data:URL fallback で Yjs を肥大化させない
 * ため）、API 側で 5MB の二段構え。
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { trpc } from '../../lib/trpc.js';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

function alertOversize(): void {
  if (typeof window !== 'undefined') {
    window.alert('画像は 2MB 以下にしてください。');
  }
}

export function fileToDataUrl(file: File): Promise<string | null> {
  if (!file.type.startsWith('image/')) return Promise.resolve(null);
  if (file.size > MAX_BYTES) {
    alertOversize();
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** "data:<mime>;base64,<payload>" → "<payload>" だけを取り出す。 */
async function fileToBase64(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : null;
      if (!result) return resolve(null);
      const idx = result.indexOf(',');
      resolve(idx >= 0 ? result.slice(idx + 1) : null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * 画像を media.upload に投げ、永続 URL（R2）か data:URL（dev fallback）を
 * 返す。ネットワークエラー時はローカル data:URL に退避する。
 */
export async function uploadImage(file: File, workspaceId: string): Promise<string | null> {
  if (!file.type.startsWith('image/')) return null;
  if (file.size > MAX_BYTES) {
    alertOversize();
    return null;
  }
  const bytes = await fileToBase64(file);
  if (!bytes) return null;
  try {
    const result = await trpc.media.upload.mutate({
      workspaceId,
      filename: file.name || 'image',
      mime: file.type,
      bytes,
    });
    return result.url;
  } catch {
    // API 不在 / network エラー → ローカル data:URL で繋ぐ。
    return fileToDataUrl(file);
  }
}

export type ImageDropPasteOptions = {
  /** Workspace id used as the upload scope. Editor で必ず configure する。 */
  workspaceId: string;
};

/**
 * 画像のドロップ / ペーストをハンドルする拡張。Image ノード（@tiptap/
 * extension-image）と併用する。workspaceId は editor.tsx で
 * `.configure({ workspaceId })` 経由で渡される。
 */
export const ImageDropPasteExtension = Extension.create<ImageDropPasteOptions>({
  name: 'imageDropPaste',
  addOptions(): ImageDropPasteOptions {
    return { workspaceId: '' };
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    const { workspaceId } = this.options;
    const insert = async (files: File[]): Promise<void> => {
      for (const file of files) {
        const src = await uploadImage(file, workspaceId);
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
