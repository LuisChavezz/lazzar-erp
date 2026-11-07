"use client";

import { useMemo, useState, type ReactNode } from "react";
import { SearchInput } from "@/src/components/SearchInput";
import { SelectListRow } from "@/src/components/SelectListRow";
import { useDebounce } from "@/src/hooks/useDebounce";

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
   * `onSelect`) y el motivo se muestra bajo su contenido. Se marca con
   * `aria-disabled`, no con `disabled`: sigue en el orden de tabulación para que
   * el teclado y el lector de pantalla lleguen a ella y a su motivo, y el clic,
   * Enter y Espacio no hacen nada. Sin la prop todas las filas se pueden
   * elegir, igual que siempre.
   */
  getItemDisabledReason?: (item: T) => string | null;
  /**
   * OPCIONAL. Milisegundos que espera el filtrado tras la última tecla, para
   * catálogos grandes (miles de ítems). Sin la prop filtra en cada tecla.
   */
  debounceMs?: number;
  /**
   * OPCIONAL. Máximo de filas que se pintan; el resto se ofrece buscando. Los
   * seleccionados fijados (`pinSelected`) siempre se pintan. Sin la prop se
   * pintan todas.
   */
  maxVisible?: number;
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
  debounceMs = 0,
  maxVisible,
}: SearchableSelectListProps<T>) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, debounceMs);
  const effectiveSearch = debounceMs > 0 ? debouncedSearch : search;

  const filteredItems = useMemo(() => {
    const term = effectiveSearch.toLowerCase().trim();
    if (!pinSelected) {
      if (!term) return items;
      return items.filter((item) => filterPredicate(item, term));
    }
    const selected = items.filter((item) => isSelected(item));
    const rest = items.filter((item) => !isSelected(item));
    return [...selected, ...(term ? rest.filter((item) => filterPredicate(item, term)) : rest)];
  }, [items, effectiveSearch, filterPredicate, pinSelected, isSelected]);

  const pinnedCount = pinSelected ? items.filter((item) => isSelected(item)).length : 0;
  const visibleItems =
    maxVisible !== undefined && filteredItems.length > maxVisible + pinnedCount
      ? filteredItems.slice(0, maxVisible + pinnedCount)
      : filteredItems;
  const hiddenCount = filteredItems.length - visibleItems.length;

  return (
    <div className="flex flex-col gap-3">
      <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder} />

      <div className="max-h-60 overflow-y-auto space-y-1 pr-1">
        {items.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{emptyMessage}</p>
        ) : filteredItems.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">{noResultsMessage}</p>
        ) : (
          visibleItems.map((item) => {
            const selected = isSelected(item);
            return (
              <SelectListRow
                key={getKey(item)}
                selected={selected}
                onSelect={() => onSelect(item)}
                indicator={renderIndicator(selected)}
                disabledReason={getItemDisabledReason?.(item) ?? null}
              >
                {renderContent(item)}
              </SelectListRow>
            );
          })
        )}
        {hiddenCount > 0 && (
          <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-2">
            Mostrando {visibleItems.length} de {filteredItems.length}. Escribe para encontrar el resto.
          </p>
        )}
      </div>
    </div>
  );
}
