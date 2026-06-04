/**
 * localStorage に永続化する列挙値の state (PBI-118)。
 *
 * ボードの表示切替（リスト / カンバン / タイムライン等）は useState の初期値
 * 依存だと、詳細ページへ遷移してブラウザ「戻る」で再マウントした際に初期値へ
 * 戻ってしまう。選択を localStorage に保存し、戻る・再読込・再訪でも保持する。
 *
 * 永続化の作法は stores/ui-store.ts に合わせる（`synapse:ui:*` キー、window
 * ガード、private モード / quota では握りつぶしてメモリ内のみ更新）。
 * 不正・未知の保存値は allowed で弾いて fallback に落とす。
 */
import { useState } from 'react';

export function usePersistentEnum<T extends string>(
  key: string,
  fallback: T,
  allowed: readonly T[],
): readonly [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      return raw && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback;
    } catch {
      return fallback;
    }
  });

  const set = (next: T): void => {
    setValue(next);
    try {
      window.localStorage.setItem(key, next);
    } catch {
      /* private モード / quota 超過 — メモリ内の値だけ更新する */
    }
  };

  return [value, set] as const;
}
