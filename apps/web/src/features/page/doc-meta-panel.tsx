/**
 * ドキュメント・メタ情報パネル（PBI-107）。ページ詳細のナビ行に置く「📑」から
 * 開くポップオーバーで、ステータス / 種別 / レビュアー / タグを編集する。
 * 大和心 Notion の「ドキュメントDB」運用を一般化したもの。
 *
 * ボタン自体が現在ステータスのバッジを兼ねる（一目で状態が分かる）。
 */
import {
  DOC_STATUSES,
  DOC_TYPES,
  type DocStatus,
  type DocType,
  type PageMetaPatch,
} from '@synapse/blocks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { docStatusLabel, docTypeLabel, statusTone } from '../../lib/labels.js';
import { trpc } from '../../lib/trpc.js';

type Meta = {
  docStatus?: DocStatus;
  docType?: DocType;
  reviewerIds?: string[];
  tags?: string[];
};

export function DocMetaPanel({ pageId, workspaceId }: { pageId: string; workspaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const page = useQuery({
    queryKey: ['block', 'getPage', pageId],
    queryFn: () => trpc.block.getPage.query({ pageId }),
  });
  const meta = (page.data?.page.props ?? {}) as Meta;
  const status = meta.docStatus;
  const reviewerIds = meta.reviewerIds ?? [];
  const tags = meta.tags ?? [];

  const update = useMutation({
    mutationFn: (patch: PageMetaPatch) => trpc.block.updatePageMeta.mutate({ pageId, patch }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['block', 'getPage', pageId] }),
  });

  const members = useQuery({
    queryKey: ['workspace', 'listMembers', workspaceId],
    queryFn: () => trpc.workspace.listMembers.query({ workspaceId }),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggleReviewer = (uid: string) =>
    update.mutate({
      reviewerIds: reviewerIds.includes(uid)
        ? reviewerIds.filter((x) => x !== uid)
        : [...reviewerIds, uid],
    });
  const addTag = () => {
    const t = tagInput.trim();
    setTagInput('');
    if (t && !tags.includes(t)) update.mutate({ tags: [...tags, t] });
  };
  const removeTag = (t: string) => update.mutate({ tags: tags.filter((x) => x !== t) });

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="page-doc-meta-button"
        data-doc-status={status ?? ''}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        title="ドキュメント情報（ステータス / 種別 / レビュアー / タグ）"
      >
        <span>📑</span>
        {status ? (
          <span
            data-testid="page-doc-status-badge"
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusTone[status] ?? ''}`}
          >
            {docStatusLabel[status]}
          </span>
        ) : (
          <span className="text-xs">情報</span>
        )}
      </button>
      {open ? (
        <div
          data-testid="doc-meta-panel"
          className="absolute right-0 top-full z-30 mt-1 w-72 space-y-3 rounded-md border border-zinc-200 bg-white p-3 text-sm shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">ステータス</span>
            <select
              value={status ?? ''}
              data-testid="doc-status-select"
              onChange={(e) =>
                update.mutate({ docStatus: e.target.value ? (e.target.value as DocStatus) : null })
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">—（未設定）</option>
              {DOC_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {docStatusLabel[s]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-zinc-500">種別</span>
            <select
              value={meta.docType ?? ''}
              data-testid="doc-type-select"
              onChange={(e) =>
                update.mutate({ docType: e.target.value ? (e.target.value as DocType) : null })
              }
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">—（未設定）</option>
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {docTypeLabel[t]}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-500">レビュアー</span>
            <div className="max-h-32 space-y-1 overflow-y-auto" data-testid="doc-reviewers">
              {members.data ? (
                members.data.map((m) => (
                  <label key={m.userId} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={reviewerIds.includes(m.userId)}
                      onChange={() => toggleReviewer(m.userId)}
                    />
                    <span className="truncate">{m.name ?? m.email}</span>
                  </label>
                ))
              ) : (
                <p className="text-xs text-zinc-400">読み込み中…</p>
              )}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-xs font-medium text-zinc-500">タグ</span>
            {tags.length > 0 ? (
              <div className="mb-1 flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800"
                  >
                    {t}
                    <button
                      type="button"
                      onClick={() => removeTag(t)}
                      className="text-zinc-400 hover:text-red-500"
                      aria-label={`タグ ${t} を削除`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addTag();
                }
              }}
              placeholder="タグを追加して Enter"
              data-testid="doc-tag-input"
              className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
