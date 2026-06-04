/**
 * Step playback state machine for "▶ 一括実行".
 *
 * `index` is the active step (−1 = idle, nothing highlighted). While
 * `playing`, a timer advances one step every `BASE_MS / speed` until the last
 * step, then stops. Manual next/prev/goTo pause playback so the user stays in
 * control. `start()` is the run-all entry point: jump to step 0 and play.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

const BASE_MS = 1100;

export type StepPlayer = {
  index: number;
  playing: boolean;
  speed: number;
  start: () => void;
  toggle: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  reset: () => void;
  goTo: (i: number) => void;
  setSpeed: (s: number) => void;
};

export function useStepPlayer(count: number): StepPlayer {
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const countRef = useRef(count);
  countRef.current = count;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  // Keep the index in range if the step list shrinks.
  useEffect(() => {
    setIndex((i) => (i > count - 1 ? count - 1 : i));
  }, [count]);

  // Advance timer while playing.
  useEffect(() => {
    if (!playing) return;
    if (count === 0) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => {
      setIndex((i) => {
        if (i >= count - 1) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, BASE_MS / speed);
    return () => clearTimeout(id);
  }, [playing, index, speed, count]);

  const start = useCallback(() => {
    if (countRef.current === 0) return;
    setIndex(0);
    setPlaying(true);
  }, []);

  const toggle = useCallback(() => {
    if (countRef.current === 0) return;
    if (playingRef.current) {
      setPlaying(false);
      return;
    }
    // Resuming: restart from 0 if idle or already at the end.
    setIndex((i) => (i < 0 || i >= countRef.current - 1 ? 0 : i));
    setPlaying(true);
  }, []);

  const pause = useCallback(() => setPlaying(false), []);
  const next = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.min(countRef.current - 1, i + 1));
  }, []);
  const prev = useCallback(() => {
    setPlaying(false);
    setIndex((i) => Math.max(0, i - 1));
  }, []);
  const reset = useCallback(() => {
    setPlaying(false);
    setIndex(-1);
  }, []);
  const goTo = useCallback((i: number) => {
    setPlaying(false);
    setIndex(Math.max(0, Math.min(countRef.current - 1, i)));
  }, []);

  return { index, playing, speed, start, toggle, pause, next, prev, reset, goTo, setSpeed };
}
