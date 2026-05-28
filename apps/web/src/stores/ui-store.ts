/**
 * Ephemeral UI state — sidebar collapse, command palette open, etc.
 *
 * Per CLAUDE.md §4: ephemeral UI lives in Zustand; server state lives in
 * TanStack Query. Do not store fetched data here.
 */
import { create } from 'zustand';

type UiState = {
  sidebarOpen: boolean;
  commandPaletteOpen: boolean;
  toggleSidebar: () => void;
  setCommandPalette: (open: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  commandPaletteOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setCommandPalette: (open) => set({ commandPaletteOpen: open }),
}));
