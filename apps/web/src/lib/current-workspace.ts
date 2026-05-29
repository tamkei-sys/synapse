/**
 * 「いま選択中のワークスペース」を扱うためのヘルパー。
 *
 * 設計：listMine の API は workspace を全件返す。クライアントは
 * localStorage に「最後に開いた id」を覚え、サイドバーから切り替えるたび
 * 上書きする。各画面は workspaces.data から該当行を pick するだけ。
 * 別タブで切替えてもの `storage` イベントで同期する。
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'synapse:current-workspace';

export function readStoredWorkspaceId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredWorkspaceId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode 等で書けないケースは諦める */
  }
}

/** 選択中の workspace id（localStorage 由来）と setter。 */
export function useStoredWorkspaceId(): readonly [string | null, (next: string | null) => void] {
  const [id, setId] = useState<string | null>(readStoredWorkspaceId);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setId(readStoredWorkspaceId());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const update = (next: string | null) => {
    writeStoredWorkspaceId(next);
    setId(next);
  };
  return [id, update] as const;
}

/** listMine + selectedId から「いま使う行」を 1 件選ぶ。 */
export function pickCurrentWorkspace<T extends { id: string }>(
  list: T[] | undefined,
  selectedId: string | null,
): T | undefined {
  if (!list || list.length === 0) return undefined;
  if (selectedId) {
    const hit = list.find((w) => w.id === selectedId);
    if (hit) return hit;
  }
  return list[0];
}

/**
 * 各画面で使う薄いラッパー。
 *   const workspace = useCurrentWorkspaceFromList(workspaces.data);
 * に書き換えれば、ワークスペース切替に追随する。
 */
export function useCurrentWorkspaceFromList<T extends { id: string }>(
  list: T[] | undefined,
): T | undefined {
  const [selectedId] = useStoredWorkspaceId();
  return pickCurrentWorkspace(list, selectedId);
}

/**
 * ワークスペース切替の入口。新 id を localStorage に書いてから
 * 'workspace' / 'block' / 'pbi' / 'sbi' / 'project' / 'sprint' /
 * 'notification' / 'apiToken' / 'audit' / 'comment' のキャッシュを
 * 一掃して再 fetch させる。
 */
export function useSwitchWorkspace(): (workspaceId: string) => Promise<void> {
  const qc = useQueryClient();
  const [, setStored] = useStoredWorkspaceId();
  return async (workspaceId: string) => {
    setStored(workspaceId);
    // 旧ワークスペースのデータを後追いで見ないよう、関連クエリを全消し。
    qc.removeQueries({
      predicate: (q) => {
        const k = q.queryKey[0];
        return (
          k === 'block' ||
          k === 'pbi' ||
          k === 'sbi' ||
          k === 'project' ||
          k === 'sprint' ||
          k === 'workspace' ||
          k === 'notification' ||
          k === 'apiToken' ||
          k === 'audit' ||
          k === 'comment'
        );
      },
    });
    await qc.invalidateQueries({ queryKey: ['workspace', 'listMine'] });
  };
}
