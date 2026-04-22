import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

interface ThemeState {
  /** Preferencia guardada por el usuario */
  theme: Theme;
  /** Tema efectivamente aplicado según preferencia o sistema */
  resolvedTheme: ResolvedTheme;
  /** Cambia la preferencia, actualiza resolvedTheme y aplica la clase en <html> */
  setTheme: (theme: Theme, isSystemDark?: boolean) => void;
  /** Actualiza resolvedTheme cuando cambia la preferencia del sistema operativo */
  syncSystemTheme: (isSystemDark: boolean) => void;
}

// ─── Utilidad: aplica/quita .dark en <html> ───────────────────────────────────

function applyDarkClass(isDark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", isDark);
}

function resolveTheme(theme: Theme, isSystemDark: boolean): ResolvedTheme {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return isSystemDark ? "dark" : "light";
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useThemeStore = create<ThemeState>()(
  devtools(
    persist(
      (set) => ({
        theme: "system",
        resolvedTheme: "light",

        setTheme: (theme, isSystemDark = false) => {
          const resolved = resolveTheme(theme, isSystemDark);
          applyDarkClass(resolved === "dark");
          set({ theme, resolvedTheme: resolved }, false, "setTheme");
        },

        syncSystemTheme: (isSystemDark) => {
          set(
            (state) => {
              if (state.theme !== "system") return {};
              const resolved: ResolvedTheme = isSystemDark ? "dark" : "light";
              applyDarkClass(resolved === "dark");
              return { resolvedTheme: resolved };
            },
            false,
            "syncSystemTheme",
          );
        },
      }),
      {
        // Persistir sólo la preferencia del usuario, no el resolvedTheme
        name: "theme-storage",
        partialize: (state) => ({ theme: state.theme }),
      },
    ),
    { name: "ThemeStore" },
  ),
);
