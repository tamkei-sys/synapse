/**
 * Dropdown 用の共通動作。
 *
 *   useDismissOnEscape(open, setOpen)
 *     open が true のとき、Esc キーで setOpen(false) する。document レベル
 *     なので menu が portal でも box の内側でも効く。
 *
 * 「外クリックで閉じる」は各コンポーネント側で wrapRef を持っているので
 * そちらに任せ、ここでは Esc だけ集約する。
 */
import { useEffect } from 'react';

export function useDismissOnEscape(open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);
}
