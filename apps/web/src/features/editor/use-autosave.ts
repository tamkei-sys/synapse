/**
 * Debounced autosave hook.
 *
 * `value` changes are queued and flushed after `delayMs` of quiet. If the
 * caller unmounts or the value changes again before the timer fires, the
 * pending save is dropped — the next change subsumes it.
 *
 * Returns a `flush` so save-on-blur or save-before-route-leave callers can
 * commit immediately.
 */
import { useEffect, useRef } from 'react';

export type SaveFn<T> = (value: T) => Promise<unknown> | void;

export function useAutosave<T>(value: T, save: SaveFn<T>, delayMs = 1_000) {
  const saveRef = useRef(save);
  saveRef.current = save;

  const lastSavedRef = useRef<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (Object.is(value, lastSavedRef.current)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void Promise.resolve(saveRef.current(value));
      lastSavedRef.current = value;
      timerRef.current = null;
    }, delayMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, delayMs]);

  return {
    flush: () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (!Object.is(value, lastSavedRef.current)) {
        void Promise.resolve(saveRef.current(value));
        lastSavedRef.current = value;
      }
    },
  };
}
