/**
 * `bookmark` — Web ブックマークのカードプレビュー (PBI-42)。
 *
 * URL の OG メタ (title / description / image / favicon / siteName) を持つ atom
 * ノード。サーバ (bookmark.fetch / lib/og-fetch) が取得したメタを属性に持ち、
 * 左にテキスト・右にサムネのカードを `<a>` で描く。embed-node が iframe で「中身」
 * を見せるのに対し、bookmark は「外部リンクの要約カード」を見せる。
 *
 * Collaboration 互換: NodeView を使わず renderHTML で素の HTML を出す。属性は
 * すべて単純な文字列で、href / data-* に round-trip させる。
 */
import { mergeAttributes, Node } from '@tiptap/core';
import type { DOMOutputSpec } from '@tiptap/pm/model';

export type BookmarkAttrs = {
  url: string;
  title: string;
  description: string;
  image: string;
  favicon: string;
  siteName: string;
};

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    bookmark: {
      setBookmark: (attrs: BookmarkAttrs) => ReturnType;
    };
  }
}

export const BookmarkNode = Node.create({
  name: 'bookmark',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    const strAttr = (attr: string) => ({
      default: '',
      parseHTML: (el: HTMLElement) => el.getAttribute(attr) ?? '',
      renderHTML: (attrs: Record<string, unknown>) => {
        // url のみ data-* ではなく href に出す（カードがリンクとして成立するように）。
        const key = attr === 'href' ? 'url' : attrKeyMap[attr];
        const value = key ? attrs[key] : undefined;
        return value ? { [attr]: String(value) } : {};
      },
    });
    return {
      url: strAttr('href'),
      title: strAttr('data-title'),
      description: strAttr('data-description'),
      image: strAttr('data-image'),
      favicon: strAttr('data-favicon'),
      siteName: strAttr('data-site-name'),
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-bookmark]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const url = String(node.attrs['url'] ?? '');
    const title = String(node.attrs['title'] ?? '') || url;
    const description = String(node.attrs['description'] ?? '');
    const image = String(node.attrs['image'] ?? '');
    const favicon = String(node.attrs['favicon'] ?? '');
    const siteName = String(node.attrs['siteName'] ?? '');
    let host = siteName;
    if (!host) {
      try {
        host = new URL(url).hostname.replace(/^www\./, '');
      } catch {
        host = url;
      }
    }

    const descSpec: DOMOutputSpec[] = description
      ? [['div', { class: 'line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400' }, description]]
      : [];
    const faviconSpec: DOMOutputSpec[] = favicon
      ? [['img', { src: favicon, alt: '', class: 'h-3.5 w-3.5 shrink-0 rounded-sm' }]]
      : [];
    const imageSpec: DOMOutputSpec[] = image
      ? [['img', { src: image, alt: '', class: 'h-auto w-36 shrink-0 self-stretch object-cover' }]]
      : [];

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-bookmark': '',
        'data-testid': 'bookmark-node',
        target: '_blank',
        rel: 'noopener noreferrer',
        class:
          'not-prose my-3 flex max-w-2xl items-stretch overflow-hidden rounded-md border border-zinc-200 no-underline transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800',
      }),
      [
        'div',
        { class: 'flex min-w-0 flex-1 flex-col justify-center gap-0.5 p-3' },
        ['div', { class: 'line-clamp-2 text-sm font-medium text-zinc-800 dark:text-zinc-100' }, title],
        ...descSpec,
        [
          'div',
          { class: 'mt-1 flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500' },
          ...faviconSpec,
          ['span', { class: 'truncate' }, host],
        ],
      ],
      ...imageSpec,
    ];
  },

  addCommands() {
    return {
      setBookmark:
        (attrs: BookmarkAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});

/** data-* 属性名 → ノード属性名の対応（renderHTML の round-trip 用）。 */
const attrKeyMap: Record<string, keyof BookmarkAttrs | undefined> = {
  'data-title': 'title',
  'data-description': 'description',
  'data-image': 'image',
  'data-favicon': 'favicon',
  'data-site-name': 'siteName',
};
