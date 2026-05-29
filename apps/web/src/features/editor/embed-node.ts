/**
 * `embed` — iframe 埋め込みブロック (PBI-43)。
 *
 * 対応: YouTube / Figma / Loom / GitHub Gist / 汎用 iframe。
 * 貼られた「閲覧 URL」を各サービスの「埋め込み URL」に正規化してから
 * iframe を描く。正規化できない URL はそのまま iframe に渡す（汎用）。
 *
 * セキュリティ: iframe には sandbox を付けて allow を絞る。任意サイトの
 * スクリプト実行は許すが、top-navigation / popup は禁止。
 *
 * Collaboration 互換: 属性は `src` 文字列のみ。NodeView を使わず
 * renderHTML で素の iframe を出す（編集はブロック選択 → 差し替え）。
 */
import { mergeAttributes, Node } from '@tiptap/core';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    embed: {
      setEmbed: (url: string) => ReturnType;
    };
  }
}

/** 各サービスの閲覧 URL → 埋め込み URL に変換。失敗時は元 URL。 */
export function toEmbedUrl(raw: string): string {
  const url = raw.trim();
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');

    // YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
    if (host === 'youtu.be') {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    // Figma
    if (host === 'figma.com') {
      return `https://www.figma.com/embed?embed_host=synapse&url=${encodeURIComponent(url)}`;
    }
    // Loom
    if (host === 'loom.com' && u.pathname.startsWith('/share/')) {
      return url.replace('/share/', '/embed/');
    }
    // GitHub Gist — gist は <script> 埋め込みが標準だが iframe で
    // ?file 無し URL をそのまま見せても可。汎用にフォールバック。
  } catch {
    // 不正 URL はそのまま返す（iframe 側で失敗表示）。
  }
  return url;
}

export const EmbedNode = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-embed-src') ?? '',
        renderHTML: (attrs) => ({ 'data-embed-src': attrs['src'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-embed]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const src = String(node.attrs['src'] ?? '');
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-embed': '',
        class: 'not-prose my-3 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-700',
      }),
      [
        'iframe',
        {
          src,
          class: 'aspect-video w-full',
          frameborder: '0',
          loading: 'lazy',
          sandbox: 'allow-scripts allow-same-origin allow-popups allow-forms',
          allow: 'fullscreen; clipboard-write; encrypted-media; picture-in-picture',
          referrerpolicy: 'no-referrer',
        },
      ],
    ];
  },

  addCommands() {
    return {
      setEmbed:
        (url: string) =>
        ({ chain }) =>
          chain()
            .insertContent({ type: this.name, attrs: { src: toEmbedUrl(url) } })
            .run(),
    };
  },
});
