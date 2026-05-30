/**
 * インラインコメントのパネル (PBI-70)。
 *
 * - `pending` がセットされると新規スレッドのコンポーザを出す。投稿すると
 *   comment.create（threadId + anchorText）→ 成功後にエディタの選択範囲へ
 *   `comment` mark（ハイライト）を貼る。
 * - 既存のスレッド（props.threadId を持つコメント）を anchorText 見出しで
 *   一覧表示し、返信・削除できる。
 *
 * バックエンドは既存の comment router を再利用（list / create / delete）。
 */
import { type Editor } from '@tiptap/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { trpc } from '../../lib/trpc.js';

export type PendingComment = { threadId: string; from: number; to: number; text: string };

type CommentRow = Awaited<ReturnType<typeof trpc.comment.list.query>>[number];
type CommentProps = {
  body?: string;
  threadId?: string;
  anchorText?: string;
  parentCommentId?: string;
};

type Thread = { threadId: string; anchorText: string; root: CommentRow; replies: CommentRow[] };

function propsOf(row: CommentRow): CommentProps {
  return (row.props ?? {}) as CommentProps;
}

function groupThreads(rows: readonly CommentRow[]): Thread[] {
  const byThread = new Map<string, { root?: CommentRow; replies: CommentRow[] }>();
  for (const row of rows) {
    const p = propsOf(row);
    if (!p.threadId) continue; // インラインスレッドのみ
    const entry = byThread.get(p.threadId) ?? { replies: [] };
    if (p.parentCommentId) entry.replies.push(row);
    else entry.root = row;
    byThread.set(p.threadId, entry);
  }
  const out: Thread[] = [];
  for (const [threadId, entry] of byThread) {
    if (!entry.root) continue; // ルートが消えたスレッドは出さない
    out.push({
      threadId,
      anchorText: propsOf(entry.root).anchorText ?? '',
      root: entry.root,
      replies: entry.replies,
    });
  }
  return out;
}

export function CommentsPanel({
  pageId,
  editor,
  pending,
  onClearPending,
}: {
  pageId: string;
  editor: Editor | null;
  pending: PendingComment | null;
  onClearPending: () => void;
}) {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['comment', 'list', pageId],
    queryFn: () => trpc.comment.list.query({ blockId: pageId }),
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['comment', 'list', pageId] });

  const create = useMutation({
    mutationFn: (input: {
      body: string;
      threadId: string;
      parentCommentId?: string;
      anchorText?: string;
    }) => trpc.comment.create.mutate({ blockId: pageId, ...input }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (commentId: string) => trpc.comment.delete.mutate({ commentId }),
    onSuccess: invalidate,
  });

  const threads = groupThreads(list.data ?? []);

  const submitNew = async (body: string) => {
    if (!pending) return;
    await create.mutateAsync({ body, threadId: pending.threadId, anchorText: pending.text });
    // 投稿成功後にハイライト mark を貼る。
    editor
      ?.chain()
      .setTextSelection({ from: pending.from, to: pending.to })
      .setComment(pending.threadId)
      .run();
    onClearPending();
  };

  if (!pending && threads.length === 0) return null;

  return (
    <section
      className="mt-10 border-t border-zinc-200 pt-6 dark:border-zinc-800"
      data-testid="comments-panel"
    >
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wide text-zinc-500">
        <span aria-hidden>💬</span>
        コメント
        {threads.length > 0 ? (
          <span className="text-xs normal-case text-zinc-400">({threads.length})</span>
        ) : null}
      </h2>

      {pending ? (
        <NewThreadComposer
          anchorText={pending.text}
          busy={create.isPending}
          onSubmit={submitNew}
          onCancel={onClearPending}
        />
      ) : null}

      <ul className="space-y-3">
        {threads.map((t) => (
          <ThreadCard
            key={t.threadId}
            thread={t}
            busy={create.isPending || remove.isPending}
            onReply={(body) =>
              create.mutate({ body, threadId: t.threadId, parentCommentId: t.root.id })
            }
            onDelete={(commentId) => remove.mutate(commentId)}
          />
        ))}
      </ul>
    </section>
  );
}

function NewThreadComposer({
  anchorText,
  busy,
  onSubmit,
  onCancel,
}: {
  anchorText: string;
  busy: boolean;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState('');
  return (
    <form
      data-testid="comment-composer"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim()) onSubmit(body.trim());
      }}
      className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      {anchorText ? (
        <p className="mb-2 truncate border-l-2 border-amber-400 pl-2 text-xs text-zinc-500">
          「{anchorText}」
        </p>
      ) : null}
      <textarea
        value={body}
        onChange={(e) => setBody(e.currentTarget.value)}
        autoFocus
        rows={2}
        placeholder="コメントを入力…（@ユーザーID でメンション）"
        data-testid="comment-composer-input"
        className="w-full resize-y rounded border border-zinc-300 bg-white px-2 py-1 text-sm focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={busy || !body.trim()}
          data-testid="comment-composer-submit"
          className="rounded bg-violet-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
        >
          コメント
        </button>
      </div>
    </form>
  );
}

function ThreadCard({
  thread,
  busy,
  onReply,
  onDelete,
}: {
  thread: Thread;
  busy: boolean;
  onReply: (body: string) => void;
  onDelete: (commentId: string) => void;
}) {
  const [reply, setReply] = useState('');
  const comments = [thread.root, ...thread.replies];
  return (
    <li
      data-testid={`comment-thread-${thread.threadId}`}
      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
    >
      {thread.anchorText ? (
        <p className="mb-2 truncate border-l-2 border-amber-400 pl-2 text-xs text-zinc-500">
          「{thread.anchorText}」
        </p>
      ) : null}
      <ul className="space-y-2">
        {comments.map((c) => {
          const p = (c.props ?? {}) as CommentProps;
          return (
            <li key={c.id} className="text-sm" data-testid={`comment-${c.id}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium">{c.authorName ?? c.authorEmail ?? '誰か'}</span>
                <button
                  type="button"
                  onClick={() => onDelete(c.id)}
                  disabled={busy}
                  aria-label="コメント削除"
                  className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
              <p className="whitespace-pre-wrap text-zinc-700 dark:text-zinc-200">{p.body}</p>
            </li>
          );
        })}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (reply.trim()) {
            onReply(reply.trim());
            setReply('');
          }
        }}
        className="mt-2 flex gap-2"
      >
        <input
          value={reply}
          onChange={(e) => setReply(e.currentTarget.value)}
          placeholder="返信…"
          data-testid={`comment-reply-input-${thread.threadId}`}
          className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs focus:outline-none dark:border-zinc-600 dark:bg-zinc-900"
        />
        <button
          type="submit"
          disabled={busy || !reply.trim()}
          data-testid={`comment-reply-submit-${thread.threadId}`}
          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          返信
        </button>
      </form>
    </li>
  );
}
