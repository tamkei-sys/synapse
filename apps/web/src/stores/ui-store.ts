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
 */
import { create } from 'zustand';

type UiState = {
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  toggleMobileSidebar: () => void;
  setCommandPalette: (open: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openMobileSidebar: () => set({ mobileSidebarOpen: true }),
  closeMobileSidebar: () => set({ mobileSidebarOpen: false }),
  toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
  setCommandPalette: (open) => set({ commandPaletteOpen: open }),
}));
