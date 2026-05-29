/**
 * 通知サウンド hook。
 *
 * unreadCount が「増えた」瞬間に短いベル音を鳴らす。減ったり同じだったり
 * 初回 fetch で 0 → N に飛ぶときは鳴らさない（タブを開いた瞬間に
 * 過去ぶんを全部鳴らしたら騒がしいだけ）。
 *
 *   useNotificationSound(unread.data?.count ?? 0)
 *
 * 音は Web Audio API で生成する short triangle wave。アセットを bundle に
 * 入れない（数 KB のために *.wav を CDN から落とすのは過剰）。
 *
 * ユーザー操作なしで AudioContext を作ると Chrome / Safari が suspend
 * 状態にする。なので最初の click でひそかに `resume()` を打つ。
 */
import { useEffect, useRef } from 'react';

import { useUiStore } from '../../stores/ui-store.js';

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  // 最初の click で resume する。
  const resume = () => {
    void ctx?.resume();
    window.removeEventListener('click', resume);
    window.removeEventListener('keydown', resume);
  };
  window.addEventListener('click', resume, { once: true });
  window.addEventListener('keydown', resume, { once: true });
  return ctx;
}

export function playNotificationChime(volume = 0.15): void {
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  // 2 tone: 880Hz → 1320Hz (簡易チャイム)
  for (const [freq, start, dur] of [
    [880, 0, 0.12],
    [1320, 0.13, 0.18],
  ] as const) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + start);
    gain.gain.linearRampToValueAtTime(volume, now + start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(now + start);
    osc.stop(now + start + dur + 0.01);
  }
}

/**
 * unreadCount を渡すと、増えた瞬間に音を鳴らす。
 * 初回 mount では鳴らさない（タブ初期化時のノイズ防止）。
 * `notificationSoundEnabled` が false のときは何もしない。
 */
export function useNotificationSound(unreadCount: number): void {
  const enabled = useUiStore((s) => s.notificationSoundEnabled);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (prev.current === null) {
      prev.current = unreadCount;
      return;
    }
    if (enabled && unreadCount > prev.current) {
      playNotificationChime();
    }
    prev.current = unreadCount;
  }, [unreadCount, enabled]);
}
