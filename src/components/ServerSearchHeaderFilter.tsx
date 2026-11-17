"use client";

import { useContext } from "react";
import type { Column } from "@tanstack/react-table";
import { FilterHeader } from "./ColumnHeaderFilter";
import { DataTableModeContext } from "./DataTableModeContext";
import type { ColumnFilterOption } from "@/src/utils/columnFilterOptions";
import { buildServerSearchFilterOptions } from "@/src/utils/serverSearchFilterOptions";

/**
 * Valor activo del filtro de servidor de una columna (`meta.serverFilter`) en
 * una `DataTable` en modo servidor; `undefined` sin filtro o fuera de ese modo.
 * Lo usa quien arma un `ServerSearchHeaderFilter` para resolver lo elegido
 * (`?ids=`) antes de pintar el menú.
 */
export function useColumnServerFilterValue<TData>(
  column: Column<TData, unknown>,
): string | undefined {
  const tableMode = useContext(DataTableModeContext);
  const key = column.columnDef.meta?.serverFilter;
  if (tableMode.mode !== "server" || key === undefined) return undefined;
  return tableMode.filters?.values[key];
}

/** Lo que da la búsqueda en el servidor de un catálogo (p. ej. `useProductSearchField`). */
export interface ServerSearchHeaderFilterSearch {
  /** Fija el texto tecleado (crudo); quien busca lo debouncea. */
  setSearch: (search: string) => void;
  /** Coincidencias de la búsqueda vigente (o de la anterior, mientras llega). */
  results: readonly ColumnFilterOption[];
  /** Cuántas coincidencias hay en el servidor (el menú pinta como mucho 50). */
  total: number | undefined;
  /** Lo pintado todavía no es de lo tecleado (debounce o petición en curso). */
  isSearching: boolean;
  /** La búsqueda nunca cargó. */
  isError: boolean;
}

interface ServerSearchHeaderFilterProps<TData> {
  column: Column<TData, unknown>;
  title: string;
  /** Qué se filtra, para el `aria-label` y el menú ("producto"). */
  label: string;
  placeholder?: string;
  menuAlign?: "start" | "end";
  search: ServerSearchHeaderFilterSearch;
  /**
   * Opción del valor activo resuelta aparte (`?ids=`), para que siga a la
   * vista aunque la búsqueda vigente no la incluya. `undefined` mientras se
   * resuelve o sin filtro.
   */
  selected?: ColumnFilterOption;
  /** El menú se abrió o cerró: buscar solo con el menú abierto. */
  onOpenChange: (open: boolean) => void;
}

/**
 * Encabezado "título + embudo" de una columna en MODO SERVIDOR cuyo filtro es
 * un catálogo demasiado grande para cargarlo completo (productos, y cualquier
 * otro selector ligero de EC-886): las opciones salen de una búsqueda en el
 * servidor mientras se teclea, nunca de las filas cargadas ni del catálogo
 * completo.
 *
 * Es presentacional: cada catálogo arma un componente pequeño que llama a sus
 * hooks de búsqueda (`createCatalogSelectorHooks`) y de resolución por ids y
 * se los pasa (ver `ProductServerSearchHeaderFilter`). La opción elegida va
 * fijada arriba —resuelta con `selected` aunque el texto ya no la encuentre— y
 * el menú no vuelve a acotar las coincidencias por la etiqueta, porque el
 * backend puede coincidir por un campo que la etiqueta no muestra.
 */
export function ServerSearchHeaderFilter<TData>({
  column,
  title,
  label,
  placeholder,
  menuAlign,
  search,
  selected,
  onOpenChange,
}: ServerSearchHeaderFilterProps<TData>) {
  const activeValue = useColumnServerFilterValue(column);
  const options = buildServerSearchFilterOptions({
    results: search.results,
    selected,
    activeValue,
  });
  return (
    <FilterHeader
      title={title}
      column={column}
      options={options}
      label={label}
      searchable={placeholder ? { placeholder } : true}
      serverSearch={{
        onQueryChange: search.setSearch,
        onOpenChange,
        total: search.total,
      }}
      isLoading={search.isSearching}
      isError={search.isError}
      menuAlign={menuAlign}
    />
  );
}
