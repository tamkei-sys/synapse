/**
 * 日本語ラベル辞書。
 *
 * Block の Zod スキーマでは enum 値（`backlog`, `in_progress`, ...）を
 * 内部表現として持ち、その値だけが API 境界・Typesense・DB に流れる。
 * 画面側の見出し・選択肢のテキストはここで集約して日本語表示に揃える。
 *
 * 大和心の Notion ワークスペースで使われている表現に寄せている。
 */
import type { PbiStatus, Priority, ProjectStatus, SbiStatus, SprintStatus } from '@synapse/blocks';

export const projectStatusLabel: Record<ProjectStatus, string> = {
  backlog: 'バックログ',
  planned: '計画済み',
  in_progress: '進行中',
  paused: '保留中',
  review: 'レビュー中',
  done: '完了',
  cancelled: '中止',
  archived: 'アーカイブ',
};

export const sprintStatusLabel: Record<SprintStatus, string> = {
  planning: '計画中',
  active: '実行中',
  review: 'レビュー中',
  done: '完了',
};

export const pbiStatusLabel: Record<PbiStatus, string> = {
  backlog: 'バックログ',
  ready: '着手可',
  in_progress: '進行中',
  review: 'レビュー中',
  done: '完了',
};

export const sbiStatusLabel: Record<SbiStatus, string> = {
  todo: 'これから',
  in_progress: '進行中',
  review: 'レビュー中',
  done: '完了',
  archived: 'アーカイブ',
};

export const priorityLabel: Record<Priority, string> = {
  must: '必須',
  should: '推奨',
  could: '可能',
  wont: '先送り',
};

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
