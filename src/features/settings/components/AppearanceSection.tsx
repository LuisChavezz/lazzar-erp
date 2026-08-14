"use client";

import { useThemeStore, type Theme } from "@/src/stores/theme.store";
import { MonitorIcon, MoonIcon, SunIcon } from "@/src/components/Icons";

// ─── Opciones de tema ─────────────────────────────────────────────────────────

const OPTIONS: Array<{
  value: Theme;
  label: string;
  hint: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = [
  { value: "light", label: "Claro", hint: "Siempre en claro", icon: SunIcon },
  { value: "dark", label: "Oscuro", hint: "Siempre en oscuro", icon: MoonIcon },
  { value: "system", label: "Sistema", hint: "Según el equipo", icon: MonitorIcon },
];

// ─── Sección ──────────────────────────────────────────────────────────────────

/**
 * Selector de apariencia del modal de configuración.
 *
 * Único punto de cambio de tema de la app: escribe en `useThemeStore`, pasando
 * la preferencia del sistema operativo que `setTheme` exige para resolver la
 * opción "Sistema".
 */
export function AppearanceSection() {
  const theme = useThemeStore((s) => s.theme);
  const resolvedTheme = useThemeStore((s) => s.resolvedTheme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 p-5 md:p-6 space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Tema</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Elige cómo se ve la aplicación en este navegador.
        </p>
      </div>

      <div role="group" aria-label="Seleccionar tema" className="grid grid-cols-3 gap-2 sm:gap-3">
        {OPTIONS.map(({ value, label, hint, icon: Icon }) => {
          const isActive = theme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => {
                const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                setTheme(value, isSystemDark);
              }}
              aria-pressed={isActive}
              title={hint}
              className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-center transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                isActive
                  ? "border-sky-500 bg-sky-50 text-sky-600 dark:border-sky-400/60 dark:bg-sky-500/10 dark:text-sky-300"
                  : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:text-sky-300"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Con "Sistema" el tema depende del equipo: se indica el resultado actual. */}
      {theme === "system" && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Actualmente se aplica el tema{" "}
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {resolvedTheme === "dark" ? "oscuro" : "claro"}
          </span>{" "}
          según la preferencia de tu equipo.
        </p>
      )}
    </section>
  );
}
