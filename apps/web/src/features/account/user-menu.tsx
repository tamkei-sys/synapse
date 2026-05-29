/**
 * 右上のユーザーメニュー。
 *
 * - アバター（自分のイニシャル or 画像）をクリックで dropdown を開く
 * - dropdown は 名前 + email + 「ログアウト」ボタン
 * - ログアウト時は signOut → React Query キャッシュを全部捨てて `/` に navigate
 *   して、未ログインのトップに戻す
 */
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { signOut, useSession } from '../../lib/auth-client.js';

export function UserMenu() {
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // dropdown 外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!session.data) return null;

  const user = session.data.user;
  const display = user.name ?? user.email;
  const initial = display.trim().slice(0, 1).toUpperCase() || '?';

  const handleSignOut = async () => {
    setBusy(true);
    try {
      await signOut();
    } catch (err) {
      console.warn('[user-menu] signOut failed:', err);
    }
    // session を失効させると useSession が再描画される。
    // 取得済みの workspace / pbi 等は全部捨てる。
    queryClient.clear();
    setBusy(false);
    setOpen(false);
    await navigate({ to: '/' });
  };

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-testid="user-menu-button"
        aria-label="ユーザーメニュー"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
      >
        {user.image ? (
          <img src={user.image} alt={display} className="h-full w-full rounded-full object-cover" />
        ) : (
          <span className="text-sm font-medium text-violet-700 dark:text-violet-200">
            {initial}
          </span>
        )}
      </button>

      {open ? (
        <div
          data-testid="user-menu-dropdown"
          className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          <header className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
            <p className="truncate text-sm font-medium">{display}</p>
            <p className="truncate text-xs text-zinc-500">{user.email}</p>
          </header>
          <div className="p-1">
            <button
              type="button"
              onClick={handleSignOut}
              disabled={busy}
              data-testid="sign-out-button"
              className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-60 dark:hover:bg-zinc-800"
            >
              <span>↩</span>
              {busy ? 'ログアウト中…' : 'ログアウト'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
