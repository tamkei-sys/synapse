/**
 * /chat — Slack 風チャット (PBI-94)。
 *
 * 左: チャンネル一覧 + 新規作成。右: 選択チャンネルのメッセージ + 入力欄。
 * リアルタイムは messages.list を 2.5s polling（Yjs と並行する sync は作らない）。
 * メッセージにリアクション（toggle）。@user-id でメンション通知。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { uploadFile } from '../features/editor/file-upload.js';
import { uploadImage } from '../features/editor/image-upload.js';
import { useCurrentWorkspaceFromList } from '../lib/current-workspace.js';
import { trpc } from '../lib/trpc.js';

type Attachment = { kind: 'image' | 'file'; url: string; name: string; mime: string };

export const Route = createFileRoute('/chat')({
  component: ChatRoute,
});

const REACTIONS = ['👍', '🎉', '👀', '✅', '🤔', '❤️'] as const;

function ChatRoute() {
  const workspaces = useQuery({
    queryKey: ['workspace', 'listMine'],
    queryFn: () => trpc.workspace.listMine.query(),
  });
  const current = useCurrentWorkspaceFromList(workspaces.data);
  if (!current) return <p className="px-6 py-12 text-sm text-zinc-500">読み込み中…</p>;
  return <ChatPanel workspaceId={current.id} />;
}

function ChatPanel({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [channelId, setChannelId] = useState<string | null>(null);

  const channels = useQuery({
    queryKey: ['chat', 'listChannels', workspaceId],
    queryFn: () => trpc.chat.listChannels.query({ workspaceId }),
  });

  // 最初のチャンネルを自動選択。
  useEffect(() => {
    if (!channelId && channels.data && channels.data.length > 0) {
      setChannelId(channels.data[0]!.id);
    }
  }, [channelId, channels.data]);

  const createChannel = useMutation({
    mutationFn: (name: string) => trpc.chat.createChannel.mutate({ workspaceId, name }),
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['chat', 'listChannels', workspaceId] });
      setChannelId(res.id);
    },
  });

  return (
    <div className="flex h-[calc(100vh-1px)] w-full max-w-none">
      {/* チャンネル一覧 */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between px-3 py-3">
          <h1 className="text-sm font-semibold">💬 チャンネル</h1>
          <button
            type="button"
            onClick={() => {
              const name = window.prompt('チャンネル名');
              if (name?.trim()) createChannel.mutate(name.trim());
            }}
            data-testid="chat-new-channel"
            className="rounded px-1.5 text-lg text-zinc-500 hover:bg-zinc-100 hover:text-violet-600 dark:hover:bg-zinc-800"
            title="チャンネルを作成"
          >
            ＋
          </button>
        </div>
        <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2" data-testid="chat-channel-list">
          {channels.data?.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setChannelId(c.id)}
                data-testid={`chat-channel-${c.id}`}
                aria-current={channelId === c.id}
                className={`w-full truncate rounded px-2 py-1.5 text-left text-sm ${
                  channelId === c.id
                    ? 'bg-violet-100 font-medium text-violet-900 dark:bg-violet-900/40 dark:text-violet-100'
                    : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                # {c.name}
              </button>
            </li>
          ))}
          {channels.data && channels.data.length === 0 ? (
            <p className="px-2 py-4 text-xs text-zinc-400" data-testid="chat-no-channels">
              ＋ でチャンネルを作成
            </p>
          ) : null}
        </ul>
      </aside>

      {/* メッセージ領域 */}
      <section className="flex min-w-0 flex-1 flex-col">
        {channelId ? (
          <ChannelView channelId={channelId} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            チャンネルを選択 / 作成してください
          </div>
        )}
      </section>
    </div>
  );
}

function ChannelView({ channelId }: { channelId: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ['chat', 'listMessages', channelId],
    queryFn: () => trpc.chat.listMessages.query({ channelId }),
    refetchInterval: 2_500, // polling（Yjs 並行 sync は作らない）
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['chat', 'listMessages', channelId] });
  const send = useMutation({
    mutationFn: (input: { body: string; attachment: Attachment | null }) =>
      trpc.chat.sendMessage.mutate({
        channelId,
        body: input.body,
        ...(input.attachment ? { attachment: input.attachment } : {}),
      }),
    onSuccess: invalidate,
  });

  const pickImage = () => {
    const el = document.createElement('input');
    el.type = 'file';
    el.accept = 'image/*';
    el.onchange = () => {
      const f = el.files?.[0];
      if (f) void uploadImage(f).then((url) => url && setAttachment({ kind: 'image', url, name: f.name, mime: f.type }));
    };
    el.click();
  };
  const pickFile = () => {
    const el = document.createElement('input');
    el.type = 'file';
    el.onchange = () => {
      const f = el.files?.[0];
      if (f) void uploadFile(f).then((u) => u && setAttachment({ kind: 'file', url: u.href, name: u.name, mime: u.mime }));
    };
    el.click();
  };
  const react = useMutation({
    mutationFn: (input: { messageId: string; emoji: (typeof REACTIONS)[number] }) =>
      trpc.chat.toggleReaction.mutate(input),
    onSuccess: invalidate,
  });

  // 新着で最下部にスクロール。
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.data]);

  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" data-testid="chat-messages">
        {messages.isPending ? (
          <p className="text-sm text-zinc-500">読み込み中…</p>
        ) : messages.data && messages.data.length > 0 ? (
          messages.data.map((m) => (
            <div key={m.id} data-testid={`chat-message-${m.id}`} className="group flex gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-700 dark:bg-violet-900/40 dark:text-violet-200">
                {(m.authorName ?? '?').trim().slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-zinc-500">
                  <span className="font-medium text-zinc-700 dark:text-zinc-200">
                    {m.authorName ?? '誰か'}
                  </span>{' '}
                  {new Date(m.createdAt).toLocaleString('ja-JP')}
                </p>
                {m.body ? (
                  <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                ) : null}
                {m.attachment ? (
                  m.attachment.kind === 'image' ? (
                    <a href={m.attachment.url} target="_blank" rel="noopener noreferrer">
                      <img
                        src={m.attachment.url}
                        alt={m.attachment.name}
                        data-testid={`chat-image-${m.id}`}
                        className="mt-1 max-h-64 max-w-sm rounded-md border border-zinc-200 object-contain dark:border-zinc-700"
                      />
                    </a>
                  ) : (
                    <a
                      href={m.attachment.url}
                      download={m.attachment.name}
                      data-testid={`chat-file-${m.id}`}
                      className="mt-1 inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      📎 {m.attachment.name || 'ファイル'}
                    </a>
                  )
                ) : null}
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {m.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => react.mutate({ messageId: m.id, emoji: r.emoji as (typeof REACTIONS)[number] })}
                      data-testid={`chat-reaction-${m.id}-${r.emoji}`}
                      data-active={r.byMe}
                      className={`rounded-full border px-1.5 py-0.5 text-xs ${
                        r.byMe
                          ? 'border-violet-300 bg-violet-50 dark:border-violet-700 dark:bg-violet-900/30'
                          : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                  {/* 追加ピッカー（hover 表示） */}
                  <span className="hidden gap-0.5 group-hover:inline-flex">
                    {REACTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => react.mutate({ messageId: m.id, emoji: e })}
                        data-testid={`chat-react-pick-${m.id}-${e}`}
                        className="rounded px-0.5 text-xs opacity-60 hover:opacity-100"
                      >
                        {e}
                      </button>
                    ))}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-400" data-testid="chat-empty">
            まだメッセージがありません。最初の投稿をどうぞ。
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = body.trim();
          if (!t && !attachment) return;
          send.mutate({ body: t, attachment });
          setBody('');
          setAttachment(null);
        }}
        className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
      >
        {attachment ? (
          <div
            data-testid="chat-attachment-preview"
            className="mb-2 flex items-center gap-2 rounded-md border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700"
          >
            <span>{attachment.kind === 'image' ? '🖼️' : '📎'}</span>
            <span className="min-w-0 flex-1 truncate">{attachment.name || '添付'}</span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              data-testid="chat-attachment-remove"
              className="shrink-0 text-zinc-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ) : null}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={pickImage}
            data-testid="chat-attach-image"
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title="画像を添付"
          >
            🖼️
          </button>
          <button
            type="button"
            onClick={pickFile}
            data-testid="chat-attach-file"
            className="rounded-md border border-zinc-300 px-2 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            title="ファイルを添付"
          >
            📎
          </button>
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="メッセージを入力…（@ユーザーID でメンション）"
            data-testid="chat-input"
            className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            type="submit"
            disabled={(!body.trim() && !attachment) || send.isPending}
            data-testid="chat-send"
            className="rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
          >
            送信
          </button>
        </div>
      </form>
    </>
  );
}
