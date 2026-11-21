import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { safeJSONStorage } from "@/src/stores/safeStorage";

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
  /**
   * Rehidrata resolvedTheme y la clase .dark al montar el cliente.
   * Lee state.theme desde el estado actual del store (no desde un closure),
   * por lo que es seguro llamarlo sin riesgo de sobrescribir la preferencia
   * persistida con un valor obsoleto del closure.
   */
  hydrate: (isSystemDark: boolean) => void;
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

        /*
         * Solo cambia `resolvedTheme`, que no se persiste (`partialize`), así
         * que no tiene nada que guardar: la escritura que `persist` hace tras
         * cada `set` repetiría el `theme` recién leído, y el almacenamiento
         * (`safeJSONStorage`) la omite por idéntica (EC-852). Solo se escribe
         * en la primera visita, sin nada guardado: `{ theme: "system" }`, que
         * el script anti-FOUC del layout trata igual que la clave ausente.
         */
        hydrate: (isSystemDark) => {
          set(
            (state) => {
              // Lee theme desde el estado actual del store, nunca del closure del componente.
              // Así evita sobrescribir la preferencia persistida con un valor obsoleto.
              const resolved = resolveTheme(state.theme, isSystemDark);
              applyDarkClass(resolved === "dark");
              return { resolvedTheme: resolved };
            },
            false,
            "hydrate",
          );
        },
      }),
      {
        // Persistir sólo la preferencia del usuario, no el resolvedTheme
        name: "theme-storage",
        storage: safeJSONStorage(),
        partialize: (state) => ({ theme: state.theme }),
      },
    ),
    { name: "ThemeStore" },
  ),
);
