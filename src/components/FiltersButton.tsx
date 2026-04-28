"use client";

import { FilterIcon, CloseIcon } from "./Icons";
import { Button } from "./Button";

// ─── Props ────────────────────────────────────────────────────────────────────
interface FiltersButtonProps {
  /** Abre el diálogo o panel de filtros */
  onFiltersClick: () => void;
  /** Indica si hay filtros activos (muestra el botón de limpiar) */
  isFiltersActive?: boolean;
  /** Limpia los filtros activos (solo visible cuando isFiltersActive=true) */
  onClearFilters?: () => void;
}

/**
 * Botón de filtros reutilizable — diseño consistente con DataTable.
 * Muestra un botón circular de limpiar junto al de filtros cuando hay filtros activos.
 */
export function FiltersButton({
  onFiltersClick,
  isFiltersActive,
  onClearFilters,
}: FiltersButtonProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        onClick={onFiltersClick}
        leftIcon={<FilterIcon className="w-4 h-4 shrink-0" aria-hidden="true" />}
        className="shrink-0"
        aria-label="Filtrar datos"
      >
        Filtros
      </Button>

      {isFiltersActive && onClearFilters && (
        <Button
          variant="secondary"
          size="icon"
          rounded="full"
          onClick={onClearFilters}
          className="border-slate-200 dark:border-white/20 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100"
          aria-label="Limpiar filtros"
        >
          <CloseIcon className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
