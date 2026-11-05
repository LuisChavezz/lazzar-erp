"use client";

import type { ReactNode } from "react";

interface SelectListRowProps {
  selected: boolean;
  onSelect: () => void;
  /** Indicador a la izquierda (radio para selección única, casilla para múltiple). */
  indicator: ReactNode;
  /**
   * Motivo por el que la fila NO se puede elegir, o `null`. Con motivo, la
   * fila queda deshabilitada y el motivo se muestra bajo su contenido. Se
   * marca con `aria-disabled`, no con `disabled`: sigue en el orden de
   * tabulación para que el teclado y el lector de pantalla lleguen a ella y a
   * su motivo, y el clic, Enter y Espacio no hacen nada.
   */
  disabledReason?: string | null;
  children: ReactNode;
}

/**
 * Renglón de una lista de selección: un botón con indicador, contenido y los
 * estilos de seleccionado, hover y deshabilitado. Lo comparten
 * `SearchableSelectList` (filtra en memoria) y `ServerSearchSelectList`
 * (busca en el servidor), para que un cambio de estilo o de accesibilidad se
 * haga una sola vez.
 */
export function SelectListRow({
  selected,
  onSelect,
  indicator,
  disabledReason = null,
  children,
}: SelectListRowProps) {
  return (
    <button
      type="button"
      // Enter y Espacio sobre un `<button>` disparan `click`: con esta guarda
      // tampoco eligen una fila deshabilitada.
      onClick={() => {
        if (disabledReason === null) onSelect();
      }}
      aria-disabled={disabledReason !== null ? true : undefined}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
        disabledReason !== null
          ? "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 opacity-60 cursor-not-allowed"
          : selected
            ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20 cursor-pointer"
            : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer"
      }`}
    >
      {indicator}
      <div className="min-w-0 flex-1">
        {children}
        {disabledReason !== null && (
          <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            {disabledReason}
          </p>
        )}
      </div>
    </button>
  );
}
