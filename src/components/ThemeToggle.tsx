'use client';

import { useThemeStore, type Theme } from '@/src/stores/theme.store';
import { SunIcon, MoonIcon, MonitorIcon } from './Icons';

// ─── Opciones del selector de tema ────────────────────────────────────────────

const OPTIONS: Array<{
  value: Theme;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}> = [
  { value: 'light', icon: SunIcon, label: 'Claro' },
  { value: 'dark', icon: MoonIcon, label: 'Oscuro' },
  { value: 'system', icon: MonitorIcon, label: 'Sistema' },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export const ThemeToggle = () => {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div
      role="group"
      aria-label="Seleccionar apariencia"
      className="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-200 dark:bg-white/5"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => {
              const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
              setTheme(value, isSystemDark);
            }}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={[
              'relative flex items-center justify-center cursor-pointer w-8 h-7 rounded-md transition-all duration-200 outline-none',
              isActive
                ? 'bg-slate-100 dark:bg-zinc-800 shadow-sm text-sky-600 dark:text-sky-400'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300',
            ].join(' ')}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {/* Indicador de selección animado */}
            {isActive && (
              <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-sky-500 dark:bg-sky-400" />
            )}
          </button>
        );
      })}
    </div>
  );
};
