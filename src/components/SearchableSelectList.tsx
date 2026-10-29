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
  /**
   * OPCIONAL (apagado por defecto). Los ítems seleccionados (`isSelected`) se
   * pintan PRIMERO y siguen visibles aunque la búsqueda los excluya, para que
   * confirmar nunca aplique una selección que el usuario ya no ve (issue #262).
   * Sin la prop la lista se comporta exactamente igual que siempre.
   */
  pinSelected?: boolean;
  /**
   * OPCIONAL (apagado por defecto). Motivo por el que `item` NO se puede elegir,
   * o `null` si se puede. Con motivo, la fila queda deshabilitada (no dispara
   * `onSelect`) y el motivo se muestra bajo su contenido. Sin la prop todas las
   * filas se pueden elegir, igual que siempre.
   */
  getItemDisabledReason?: (item: T) => string | null;
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
  pinSelected = false,
  getItemDisabledReason,
}: SearchableSelectListProps<T>) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!pinSelected) {
      if (!term) return items;
      return items.filter((item) => filterPredicate(item, term));
    }
    const selected = items.filter((item) => isSelected(item));
    const rest = items.filter((item) => !isSelected(item));
    return [...selected, ...(term ? rest.filter((item) => filterPredicate(item, term)) : rest)];
  }, [items, search, filterPredicate, pinSelected, isSelected]);

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
            const disabledReason = getItemDisabledReason?.(item) ?? null;
            return (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => onSelect(item)}
                disabled={disabledReason !== null}
                aria-pressed={selected}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                  disabledReason !== null
                    ? "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/2 opacity-60 cursor-not-allowed"
                    : selected
                      ? "border-sky-400 bg-sky-50 dark:border-sky-600 dark:bg-sky-900/20 cursor-pointer"
                      : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 cursor-pointer"
                }`}
              >
                {renderIndicator(selected)}
                <div className="min-w-0 flex-1">
                  {renderContent(item)}
                  {disabledReason !== null && (
                    <p className="mt-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                      {disabledReason}
                    </p>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
