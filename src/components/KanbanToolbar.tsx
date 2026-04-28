"use client";

import type { ReactNode } from "react";
import { SearchInput } from "./SearchInput";
import { FiltersButton } from "./FiltersButton";

// ─── Props ────────────────────────────────────────────────────────────────────
interface KanbanToolbarProps {
  /** Valor actual del campo de búsqueda */
  searchValue: string;
  onSearchChange: (value: string) => void;
  /** Placeholder para el campo de búsqueda */
  searchPlaceholder?: string;
  /** Abre el diálogo de filtros */
  onFiltersClick?: () => void;
  /** Indica si hay filtros activos (resalta el botón) */
  isFiltersActive?: boolean;
  /** Limpia los filtros activos */
  onClearFilters?: () => void;
  /** Botón de acción primaria (e.g. "Nueva cotización") */
  actionButton?: ReactNode;
}

/**
 * Barra de herramientas reutilizable para tableros kanban.
 * Todo el contenido alineado a la derecha, consistente con DataTable.
 */
export function KanbanToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  onFiltersClick,
  isFiltersActive,
  onClearFilters,
  actionButton,
}: KanbanToolbarProps) {
  return (
    <div
      className="flex items-center justify-end gap-2 flex-wrap"
      role="toolbar"
      aria-label="Barra de herramientas del tablero"
    >
      {/* Búsqueda */}
      <SearchInput
        value={searchValue}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="w-full sm:w-64 lg:w-72 lg:flex-none"
      />

      {/* Filtros + limpiar */}
      {onFiltersClick && (
        <FiltersButton
          onFiltersClick={onFiltersClick}
          isFiltersActive={isFiltersActive}
          onClearFilters={onClearFilters}
        />
      )}

      {/* Acción primaria */}
      {actionButton}
    </div>
  );
}
