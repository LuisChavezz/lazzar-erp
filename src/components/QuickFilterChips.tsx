"use client";

/** Un atajo: etiqueta, color de su punto y cuántas filas cumple. */
export interface QuickFilterChip {
  key: string;
  label: string;
  dotClassName: string;
  count?: number;
}

/**
 * Fila de atajos de filtro de un clic sobre una tabla ("Con existencia",
 * "Activos"…), con el conteo de cada uno. Solo pinta y avisa el elegido: quien
 * la monta filtra el arreglo que le pasa a `DataTable`, y eso se combina con la
 * búsqueda y los filtros de encabezado. En móvil se desliza de lado.
 */
export function QuickFilterChips({
  chips,
  value,
  onChange,
  label,
}: {
  chips: QuickFilterChip[];
  value: string;
  onChange: (key: string) => void;
  /** Nombre accesible del grupo. */
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex shrink-0 gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {chips.map((chip) => {
        const isActive = chip.key === value;
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(chip.key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
              isActive
                ? "border-sky-500 bg-sky-500 text-white"
                : "border-slate-200 dark:border-white/10 bg-white dark:bg-black text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-500/40"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-white" : chip.dotClassName}`}
              aria-hidden="true"
            />
            {chip.label}
            {chip.count !== undefined && (
              <span
                className={`tabular-nums rounded-full px-1.5 text-[10px] ${
                  isActive
                    ? "bg-white/20"
                    : "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400"
                }`}
              >
                {chip.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
