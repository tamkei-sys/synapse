/**
 * `comment` mark — インラインコメント (PBI-70) のハイライト。
 *
 * 選択範囲にこの mark を付けると黄色くハイライトされ、`threadId` で
 * コメントスレッド（comment ブロック群, props.threadId 共有）と紐づく。
 * クリックすると対象スレッドへスクロールできるよう data 属性を出す。
 *
 * Yjs Collaboration と併用する mark なので、ProseMirror schema 変更に
 * あたる。s3（co-edit）E2E で互換を確認すること。
 */
import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    comment: {
      setComment: (threadId: string) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: 'comment',
  // ハイライト端でタイプを続けても mark が伸びないように。
  inclusive: false,
  // bold 等と重ねられるように exclude しない。
  excludes: '',

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-comment-thread-id'),
        renderHTML: (attrs) =>
          attrs['threadId'] ? { 'data-comment-thread-id': attrs['threadId'] } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-thread-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-comment': '',
        class:
          'rounded-sm bg-amber-100 underline decoration-amber-400 decoration-dotted underline-offset-2 cursor-pointer dark:bg-amber-500/25',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (threadId) =>
        ({ commands }) =>
          commands.setMark(this.name, { threadId }),
      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
