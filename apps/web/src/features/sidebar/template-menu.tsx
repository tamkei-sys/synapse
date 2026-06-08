/**
 * テンプレートから新規ページを作るメニュー (PBI-55)。
 *
 * Sidebar の「+」(空ページ作成) の隣に置く「📋」ボタン。クリックで
 * ワークスペースのテンプレ一覧をポップオーバー表示し、選ぶと
 * createFromTemplate → 新ページへ遷移する。テンプレが無ければ空状態を出す。
 *
 * 外クリック / Esc で閉じる挙動は EmojiPicker と同方式。一覧はメニューを
 * 開いたときだけ取得する (enabled: open)。
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { useT } from '../../lib/i18n.js';
import { trpc } from '../../lib/trpc.js';

export function TemplateMenu({
  workspaceId,
  onNavigate,
}: {
  workspaceId: string;
  onNavigate?: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const templates = useQuery({
    queryKey: ['block', 'listTemplates', workspaceId],
    queryFn: () => trpc.block.listTemplates.query({ workspaceId }),
    enabled: open,
  });

  const createFromTemplate = useMutation({
    mutationFn: (templateId: string) => trpc.block.createFromTemplate.mutate({ templateId }),
    onSuccess: async (row) => {
      setOpen(false);
      await qc.invalidateQueries({ queryKey: ['block', 'listAllPages', workspaceId] });
      await qc.invalidateQueries({ queryKey: ['block', 'listPages', workspaceId] });
      onNavigate?.();
      await navigate({ to: '/p/$pageId', params: { pageId: row.id } });
    },
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="sidebar-templates"
        className="flex h-7 w-7 items-center justify-center rounded text-sm text-zinc-500 hover:bg-zinc-200 hover:text-violet-600 dark:hover:bg-zinc-800 dark:hover:text-violet-300"
        title={t('nav.newFromTemplate')}
        aria-label={t('nav.newFromTemplate')}
        aria-expanded={open}
      >
        📋
      </button>
      {open ? (
        <div
          data-testid="template-menu"
          className="absolute left-0 top-full z-30 mt-1 w-56 max-w-[calc(100vw_-_1.5rem)] rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <p className="px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
            {t('nav.newFromTemplate')}
          </p>
          {templates.isPending ? (
            <p className="px-2 py-2 text-xs text-zinc-500">{t('common.loading')}</p>
          ) : !templates.data || templates.data.length === 0 ? (
            <p className="px-2 py-2 text-xs text-zinc-500" data-testid="template-menu-empty">
              {t('nav.noTemplates')}
            </p>
          ) : (
            <ul className="max-h-72 space-y-0.5 overflow-y-auto">
              {templates.data.map((tpl) => (
                <li key={tpl.id}>
                  <button
                    type="button"
                    onClick={() => createFromTemplate.mutate(tpl.id)}
                    disabled={createFromTemplate.isPending}
                    data-testid={`template-item-${tpl.id}`}
                    className="flex min-h-9 w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-zinc-100 disabled:opacity-50 dark:hover:bg-zinc-800"
                  >
                    <span className="w-4 text-center text-xs">{tpl.icon || '📄'}</span>
                    <span className="min-w-0 truncate">{tpl.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
