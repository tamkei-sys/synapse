/**
 * `file` — ファイル添付ブロック (PBI-40)。
 *
 * 任意のファイルを「📎 ファイル名 (サイズ)」のダウンロードリンクとして置く
 * atom ノード。href は dev では data-URL、本番では R2 公開 URL（file-upload の
 * seam が決める）。Collaboration 互換のため属性は単純な文字列/数値のみ。
 *
 * 公開ページ (PBI-56) では sanitizePublicDoc の許可リストに含めていないので、
 * read-only 共有では添付は表示されない（社内データの非公開化）。
 */
import { mergeAttributes, Node } from '@tiptap/core';

export type FileAttrs = { href: string; name: string; size: number; mime: string };

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    file: {
      setFile: (attrs: FileAttrs) => ReturnType;
    };
  }
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileNode = Node.create({
  name: 'file',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      href: {
        default: '',
        parseHTML: (el) => el.getAttribute('href') ?? '',
        renderHTML: (attrs) => (attrs['href'] ? { href: String(attrs['href']) } : {}),
      },
      name: {
        default: 'file',
        parseHTML: (el) => el.getAttribute('data-name') ?? 'file',
        renderHTML: (attrs) => ({ 'data-name': String(attrs['name'] ?? 'file') }),
      },
      size: {
        default: 0,
        parseHTML: (el) => Number(el.getAttribute('data-size') ?? 0),
        renderHTML: (attrs) => ({ 'data-size': String(attrs['size'] ?? 0) }),
      },
      mime: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-mime') ?? '',
        renderHTML: (attrs) => (attrs['mime'] ? { 'data-mime': String(attrs['mime']) } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-file]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const name = String(node.attrs['name'] ?? 'file');
    const size = formatSize(Number(node.attrs['size'] ?? 0));
    const label = size ? `📎 ${name} (${size})` : `📎 ${name}`;
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-file': '',
        'data-testid': 'file-node',
        download: name,
        rel: 'noopener noreferrer',
        class:
          'not-prose my-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 no-underline hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700',
      }),
      label,
    ];
  },

  addCommands() {
    return {
      setFile:
        (attrs: FileAttrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
