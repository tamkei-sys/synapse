/**
 * `video` / `audio` — メディア埋め込みブロック (PBI-41)。
 *
 * 動画・音声を controls 付きのインラインプレーヤーとして置く atom ノード。
 * src は dev では data-URL、本番では R2 公開 URL（file-upload の seam が決める）。
 * ファイル添付 (PBI-40) と同じくアップロード経由で挿入する。
 *
 * 公開ページ (PBI-56) では sanitizePublicDoc の許可リストに含めていないので、
 * read-only 共有では再生プレーヤーは表示されない（社内データの非公開化）。
 */
import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    video: {
      setVideo: (attrs: { src: string }) => ReturnType;
    };
    audio: {
      setAudio: (attrs: { src: string }) => ReturnType;
    };
  }
}

const srcAttribute = {
  src: {
    default: '',
    parseHTML: (el: HTMLElement) => el.getAttribute('src') ?? '',
    renderHTML: (attrs: Record<string, unknown>) =>
      attrs['src'] ? { src: String(attrs['src']) } : {},
  },
};

export const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return srcAttribute;
  },

  parseHTML() {
    return [{ tag: 'video[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'video',
      mergeAttributes(HTMLAttributes, {
        controls: 'true',
        preload: 'metadata',
        'data-testid': 'video-node',
        class: 'my-2 max-w-full rounded-md',
      }),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (attrs: { src: string }) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

export const AudioNode = Node.create({
  name: 'audio',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return srcAttribute;
  },

  parseHTML() {
    return [{ tag: 'audio[src]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'audio',
      mergeAttributes(HTMLAttributes, {
        controls: 'true',
        preload: 'metadata',
        'data-testid': 'audio-node',
        class: 'my-2 w-full',
      }),
    ];
  },

  addCommands() {
    return {
      setAudio:
        (attrs: { src: string }) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
