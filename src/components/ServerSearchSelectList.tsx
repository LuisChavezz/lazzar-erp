"use client";

import type { ReactNode } from "react";
import { SearchInput } from "@/src/components/SearchInput";
import { SelectListRow } from "@/src/components/SelectListRow";
import { LoadingSpinnerIcon } from "@/src/components/Icons";

interface ServerSearchSelectListProps<T> {
  /** Texto del buscador TAL CUAL se teclea; el consumidor lo debounce para su consulta. */
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  /** Coincidencias de la búsqueda en el servidor (una página). */
  results: T[];
  /**
   * Lo SELECCIONADO, fijo arriba y visible aunque la búsqueda no lo incluya
   * (issue #262): confirmar nunca aplica una selección que el usuario no ve.
   * Lo arma el consumidor con lo que sabe de cada seleccionado (el objeto que
   * eligió, o los datos guardados del registro), nunca buscándolo en
   * `results`. Se omite de los resultados para no repetirlo.
   */
  pinned: T[];
  getKey: (item: T) => string | number;
  isSelected: (item: T) => boolean;
  onSelect: (item: T) => void;
  /** Indicador a la izquierda de cada fila (radio para selección única, casilla para múltiple). */
  renderIndicator: (selected: boolean) => ReactNode;
  /** Contenido de cada fila (a la derecha del indicador). */
  renderContent: (item: T) => ReactNode;
  /** Ya hay resultados que pintar (de esta búsqueda o, mientras llega, de la anterior). */
  hasResults: boolean;
  /** La búsqueda actual nunca cargó y falló. */
  isInitialError: boolean;
  /** Hay una búsqueda en camino: los resultados pintados son de la anterior. */
  isSearching: boolean;
  onRetry: () => void;
  /** Total de coincidencias en el servidor; si supera `results`, se avisa que hay más. */
  total: number;
  /** Sin coincidencias y sin término de búsqueda. */
  emptyMessage: string;
  /** Sin coincidencias para el término tecleado. */
  noResultsMessage: string;
  errorMessage: string;
  /** Alto máximo de la lista con scroll (clase de Tailwind). */
  maxHeightClassName?: string;
}

/**
 * Lista de selección cuya búsqueda corre EN EL SERVIDOR: el consumidor hace la
 * consulta (debounced, con `limit`) y pasa sus coincidencias en `results`.
 * Hermana de `SearchableSelectList`, que filtra en memoria un arreglo
 * precargado: mismo renglón y mismo indicador, pero aquí lo seleccionado se
 * recibe aparte (`pinned`), porque puede no estar en la página de resultados.
 *
 * Los estados de carga y error solo ocupan la zona de resultados: lo
 * seleccionado y el buscador siguen montados.
 */
export function ServerSearchSelectList<T>({
  search,
  onSearchChange,
  searchPlaceholder,
  results,
  pinned,
  getKey,
  isSelected,
  onSelect,
  renderIndicator,
  renderContent,
  hasResults,
  isInitialError,
  isSearching,
  onRetry,
  total,
  emptyMessage,
  noResultsMessage,
  errorMessage,
  maxHeightClassName = "max-h-60",
}: ServerSearchSelectListProps<T>) {
  const pinnedKeys = new Set(pinned.map(getKey));
  const rest = results.filter((item) => !pinnedKeys.has(getKey(item)));
  const hasSearch = search.trim() !== "";
  const hiddenCount = total - results.length;

  const renderRow = (item: T) => {
    const selected = isSelected(item);
    return (
      <SelectListRow
        key={getKey(item)}
        selected={selected}
        onSelect={() => onSelect(item)}
        indicator={renderIndicator(selected)}
      >
        {renderContent(item)}
      </SelectListRow>
    );
  };

  return (
    <div
      className="flex flex-col gap-3"
      // Enter en el buscador NO envía el formulario que envuelva la lista: se
      // escribe ahí para buscar.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <SearchInput value={search} onChange={onSearchChange} placeholder={searchPlaceholder} />

      <div className={`${maxHeightClassName} overflow-y-auto space-y-1 pr-1`}>
        {pinned.map(renderRow)}

        {pinned.length > 0 && (
          <div className="pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Resultados de la búsqueda
          </div>
        )}

        {isInitialError ? (
          <p role="alert" className="py-4 text-center text-sm text-red-500">
            {errorMessage}{" "}
            <button
              type="button"
              onClick={onRetry}
              className="font-semibold underline cursor-pointer"
            >
              Reintentar
            </button>
          </p>
        ) : !hasResults ? (
          <p
            role="status"
            className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400"
          >
            <LoadingSpinnerIcon className="w-4 h-4 animate-spin" aria-hidden="true" />
            Buscando...
          </p>
        ) : rest.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {hasSearch ? noResultsMessage : emptyMessage}
          </p>
        ) : (
          <div
            aria-busy={isSearching || undefined}
            className={`space-y-1 transition-opacity ${isSearching ? "opacity-60" : ""}`}
          >
            {rest.map(renderRow)}
            {hiddenCount > 0 && (
              <p className="pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
                Se muestran {results.length} de {total} coincidencias. Escribe más para acotar
                la búsqueda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
