/**
 * Pan + zoom for the flow canvas.
 *
 * State is a single `{ x, y, k }` view transform (screen = world * k + (x,y)).
 * Wheel zooms toward the cursor; dragging the background pans. `fit()` frames
 * the whole graph centered in the viewport. Wheel is bound imperatively with
 * `{ passive: false }` so we can `preventDefault` the page scroll.
 */
import { useCallback, useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';

import type { Bounds } from './geometry.js';

export type View = { x: number; y: number; k: number };

const MIN_K = 0.2;
const MAX_K = 2.5;
const clampK = (k: number): number => Math.min(MAX_K, Math.max(MIN_K, k));

export type PanZoom = {
  view: View;
  fit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  onBackgroundPointerDown: (e: PointerEvent) => void;
  onBackgroundPointerMove: (e: PointerEvent) => void;
  onBackgroundPointerUp: (e: PointerEvent) => void;
  panning: boolean;
};

export function usePanZoom(frameRef: RefObject<HTMLElement | null>, bounds: Bounds): PanZoom {
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [panning, setPanning] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );

  const fit = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    const pad = 56;
    const k = clampK(
      Math.min(
        (r.width - pad * 2) / Math.max(1, bounds.width),
        (r.height - pad * 2) / Math.max(1, bounds.height),
      ),
    );
    const x = (r.width - bounds.width * k) / 2 - bounds.minX * k;
    const y = (r.height - bounds.height * k) / 2 - bounds.minY * k;
    setView({ x, y, k });
  }, [frameRef, bounds]);

  // Wheel zoom toward the cursor (non-passive so we can preventDefault).
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const px = e.clientX - r.left;
      const py = e.clientY - r.top;
      setView((v) => {
        const k = clampK(v.k * Math.exp(-e.deltaY * 0.0015));
        const ratio = k / v.k;
        return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [frameRef]);

  const onBackgroundPointerDown = useCallback((e: PointerEvent) => {
    if (e.button !== 0) return;
    const v = viewRef.current;
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: v.x, origY: v.y };
    setPanning(true);
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
  }, []);

  const onBackgroundPointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setView((v) => ({ ...v, x: d.origX + (e.clientX - d.startX), y: d.origY + (e.clientY - d.startY) }));
  }, []);

  const onBackgroundPointerUp = useCallback((e: PointerEvent) => {
    dragRef.current = null;
    setPanning(false);
    (e.currentTarget as Element).releasePointerCapture?.(e.pointerId);
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const r = frameRef.current?.getBoundingClientRect();
      const px = r ? r.width / 2 : 0;
      const py = r ? r.height / 2 : 0;
      setView((v) => {
        const k = clampK(v.k * factor);
        const ratio = k / v.k;
        return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
      });
    },
    [frameRef],
  );

  return {
    view,
    fit,
    zoomIn: () => zoomBy(1.2),
    zoomOut: () => zoomBy(1 / 1.2),
    onBackgroundPointerDown,
    onBackgroundPointerMove,
    onBackgroundPointerUp,
    panning,
  };
}
