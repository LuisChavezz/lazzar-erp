import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SidebarState {
  /** Indica si el sidebar está anclado (expandido de forma permanente). */
  isPinned: boolean;
  /** Alterna entre estado anclado y no anclado. */
  togglePin: () => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSidebarStore = create<SidebarState>()(
  devtools(
    persist(
      (set) => ({
        isPinned: false,

        togglePin: () =>
          set((state) => ({ isPinned: !state.isPinned }), false, "togglePin"),
      }),
      { // Nombre del storage para persistencia
        name: "sidebar-storage",
      },
    ),
    { // Nombre del store para devtools
      name: "sidebar-store",
    },
  ),
);
