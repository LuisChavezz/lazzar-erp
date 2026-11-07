"use client";

export interface ListTab<K extends string> {
  key: K;
  label: string;
  count: number;
}

/**
 * Pestañas de un listado (p. ej. "En curso" / "Completadas"): separan lo
 * terminado sin salir de la página. Píldora segmentada con el conteo de cada
 * pestaña; `isReady` en `false` muestra "…" mientras la lista carga.
 */
export function ListTabs<K extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  isReady = true,
}: {
  tabs: readonly ListTab<K>[];
  value: K;
  onChange: (key: K) => void;
  ariaLabel: string;
  isReady?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex self-start rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-1"
    >
      {tabs.map((tab) => {
        const active = value === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors cursor-pointer ${
              active
                ? "bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${
                active
                  ? "bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300"
                  : "bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400"
              }`}
            >
              {isReady ? tab.count : "…"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
