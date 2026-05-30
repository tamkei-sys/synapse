/**
 * ステータス / 優先度 のラベル辞書。
 *
 * Block の Zod スキーマでは enum 値（`backlog`, `in_progress`, ...）を
 * 内部表現として持ち、その値だけが API 境界・Typesense・DB に流れる。
 * 画面側の見出し・選択肢のテキストはここで集約。
 *
 * R15 (PBI-25) 以降は ja/en の locale 切替に対応。`useLabels()` を呼ぶと
 * 現 locale のラベル辞書が返る。古い `pbiStatusLabel` 等の素の Record
 * エクスポートはコンポーネントの段階的移行のため当面は ja のまま
 * 互換 export として残す（locale を「跨ぐ」場面が無いコンポーネントは
 * useLabels() に置き換え予定）。
 */
import type { PbiStatus, Priority, ProjectStatus, SbiStatus, SprintStatus } from '@synapse/blocks';

import { type Locale, tFor, useLocale } from './i18n.js';

function build<T extends string>(locale: Locale, prefix: string, keys: readonly T[]): Record<T, string> {
  const out = {} as Record<T, string>;
  for (const k of keys) out[k] = tFor(locale, `${prefix}.${k}`);
  return out;
}

const PROJECT_KEYS = [
  'backlog',
  'planned',
  'in_progress',
  'paused',
  'review',
  'done',
  'cancelled',
  'archived',
] as const satisfies readonly ProjectStatus[];
const SPRINT_KEYS = ['planning', 'active', 'review', 'done'] as const satisfies readonly SprintStatus[];
const PBI_KEYS = ['backlog', 'ready', 'in_progress', 'review', 'done'] as const satisfies readonly PbiStatus[];
const SBI_KEYS = [
  'todo',
  'in_progress',
  'review',
  'done',
  'archived',
] as const satisfies readonly SbiStatus[];
const PRIORITY_KEYS = ['must', 'should', 'could', 'wont'] as const satisfies readonly Priority[];

/** 旧 API: 日本語固定の Record。ステップワイズ移行のため残しておく。 */
export const projectStatusLabel: Record<ProjectStatus, string> = build('ja', 'status.project', PROJECT_KEYS);
export const sprintStatusLabel: Record<SprintStatus, string> = build('ja', 'status.sprint', SPRINT_KEYS);
export const pbiStatusLabel: Record<PbiStatus, string> = build('ja', 'status.pbi', PBI_KEYS);
export const sbiStatusLabel: Record<SbiStatus, string> = build('ja', 'status.sbi', SBI_KEYS);
export const priorityLabel: Record<Priority, string> = build('ja', 'priority', PRIORITY_KEYS);

/**
 * 現 locale の全 enum ラベルをまとめて返す hook。新規コンポーネントは
 * これを使う。store 購読しているので locale 切替で自動再 render。
 */
export function useLabels(): {
  locale: Locale;
  projectStatus: Record<ProjectStatus, string>;
  sprintStatus: Record<SprintStatus, string>;
  pbiStatus: Record<PbiStatus, string>;
  sbiStatus: Record<SbiStatus, string>;
  priority: Record<Priority, string>;
} {
  const locale = useLocale();
  return {
    locale,
    projectStatus: build(locale, 'status.project', PROJECT_KEYS),
    sprintStatus: build(locale, 'status.sprint', SPRINT_KEYS),
    pbiStatus: build(locale, 'status.pbi', PBI_KEYS),
    sbiStatus: build(locale, 'status.sbi', SBI_KEYS),
    priority: build(locale, 'priority', PRIORITY_KEYS),
  };
}

/** ステータスチップの配色トーン（Tailwind クラスを揃える）。 */
export const statusTone: Record<string, string> = {
  // pbi / project / sprint / sbi 共通の見た目
  backlog: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  planning: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  todo: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  planned: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  ready: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  active: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  in_progress: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  done: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  archived: 'bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500',
};

export const priorityTone: Record<Priority, string> = {
  must: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  should: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  could: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  wont: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

/** Block 種別の人間向け表記。 */
export const blockTypeLabel: Record<string, string> = {
  page: 'ページ',
  project: 'プロジェクト',
  sprint: 'スプリント',
  pbi: 'PBI',
  sbi: 'SBI',
  sheet: 'スプレッドシート',
};

/** Block 種別ごとの人間 ID プレフィックス。 */
export const blockHumanPrefix: Record<string, string> = {
  project: 'PRJ',
  sprint: 'SP',
  pbi: 'PBI',
  sbi: 'SBI',
};

/** 日付文字列（ISO date）を「2026/05/29」表記に揃える。 */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso;
  }
}

/** タイムスタンプ（Date / ISO）を「05/29 14:23」表記に揃える。 */
export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return '—';
  try {
    const date = typeof d === 'string' ? new Date(d) : d;
    return date.toLocaleString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(d);
  }
}
