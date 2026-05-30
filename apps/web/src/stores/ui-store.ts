/**
 * Ephemeral UI state — sidebar collapse, command palette open, etc.
 *
 * Per CLAUDE.md §4: ephemeral UI lives in Zustand; server state lives in
 * TanStack Query. Do not store fetched data here.
 *
 * - `sidebarOpen` is desktop ピン留めの将来用フラグ。今は常に true。
 * - `mobileSidebarOpen` は **モバイル幅のときだけ** 効くドロワー開閉。
 *   md 以上は CSS で常時 sidebar が出るので mobileSidebarOpen は無視される。
 *   ナビゲーションした瞬間に自動で閉じたいので、Sidebar 側で Link クリック時に
 *   `closeMobileSidebar()` を呼ぶ。
 * - `notificationSoundEnabled` は通知音のオン/オフ。localStorage に
 *   `synapse:ui:notif-sound` キーで永続化する。
 */
import { create } from 'zustand';

const SOUND_KEY = 'synapse:ui:notif-sound';
const LOCALE_KEY = 'synapse:ui:locale';

type Locale = 'ja' | 'en';

function loadSoundPref(): boolean {
  if (typeof window === 'undefined') return true;
  const raw = window.localStorage.getItem(SOUND_KEY);
  if (raw === null) return true; // default on
  return raw === '1';
}

function saveSoundPref(v: boolean) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOUND_KEY, v ? '1' : '0');
}

function loadLocale(): Locale {
  if (typeof window === 'undefined') return 'ja';
  const raw = window.localStorage.getItem(LOCALE_KEY);
  if (raw === 'en') return 'en';
  if (raw === 'ja') return 'ja';
  // ブラウザ言語から推測。en-* なら en、それ以外は ja。
  const navLang = window.navigator?.language ?? 'ja';
  return navLang.startsWith('en') ? 'en' : 'ja';
}

function saveLocale(v: Locale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCALE_KEY, v);
}

type UiState = {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  notificationSoundEnabled: boolean;
  locale: Locale;
  toggleSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
  setCommandPalette: (open: boolean) => void;
  setNotificationSoundEnabled: (v: boolean) => void;
  setLocale: (v: Locale) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  notificationSoundEnabled: loadSoundPref(),
  locale: loadLocale(),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setCommandPalette: (open) => set({ commandPaletteOpen: open }),
  setNotificationSoundEnabled: (v) => {
    saveSoundPref(v);
    set({ notificationSoundEnabled: v });
  },
  setLocale: (v) => {
    saveLocale(v);
    set({ locale: v });
  },
}));
