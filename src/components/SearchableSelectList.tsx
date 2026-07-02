"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchInput } from "@/src/components/SearchInput";

interface SearchableSelectListProps<T> {
  items: T[];
  searchPlaceholder: string;
  /** Determina si `item` coincide con el término de búsqueda (ya en minúsculas y sin espacios extremos). */
  filterPredicate: (item: T, term: string) => boolean;
  getKey: (item: T) => string | number;
  isSelected: (item: T) => boolean;
  onSelect: (item: T) => void;
  /** Indicador a la izquierda de cada fila (radio para selección única, casilla para múltiple). */
  renderIndicator: (selected: boolean) => ReactNode;
  /** Contenido de cada fila (a la derecha del indicador). */
  renderContent: (item: T) => ReactNode;
  /** Mensaje cuando `items` está vacío. */
  emptyMessage: string;
  /** Mensaje cuando el filtro de búsqueda no encuentra resultados. */
  noResultsMessage: string;
}

/**
 * Lista buscable de selección con un renglón por ítem (radio o casilla según
 * `renderIndicator`). Extraída de `InvoiceOrderSelector` y
 * `ProductionOrderStep1`, que compartían esta estructura pero difieren en el
 * modo de selección (única vs múltiple) y en los campos mostrados por fila —
 * de ahí que ambos aspectos queden parametrizados en vez de fijos aquí.
 */
export function SearchableSelectList<T>({
  items,
  searchPlaceholder,
  filterPredicate,
  getKey,
  isSelected,
  onSelect,
  renderIndicator,
  renderContent,
  emptyMessage,
  noResultsMessage,
}: SearchableSelectListProps<T>) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return items;
    return items.filter((item) => filterPredicate(item, term));
  }, [items, search, filterPredicate]);

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder} />

      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{emptyMessage}</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{noResultsMessage}</p>
        ) : (
          filteredItems.map((item) => {
            const selected = isSelected(item);
            return (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => onSelect(item)}
                aria-pressed={selected}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 cursor-pointer ${
                  selected
                    ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10"
                }`}
              >
                {renderIndicator(selected)}
                <div className="min-w-0 flex-1">{renderContent(item)}</div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
