"use client";

import { createContext } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";

/**
 * Filtros de servidor que `DataTable` publica a sus encabezados cuando está en
 * modo servidor (`server.filters`). Las claves son las del endpoint (las que
 * declara `meta.serverFilter` en cada columna), no ids de columna.
 */
export interface DataTableServerFilters {
  /** Clave de filtro → valor ya validado. Una clave ausente = sin filtro. */
  values: Readonly<Record<string, string>>;
  /** `undefined` quita el filtro (opción "Todos"). */
  onChange: (key: string, value: string | undefined) => void;
  /**
   * Claves que la lista acepta. Solo sirve para avisar en desarrollo de un
   * `meta.serverFilter` que no está entre ellas; si se omite, no se comprueba.
   */
  keys?: readonly string[];
}

/**
 * En qué modo está la `DataTable` que envuelve a un encabezado:
 *
 * - `client` (por defecto, también FUERA de una tabla): todo en memoria.
 *   `columnFilters` es el estado de filtros de columna de la tabla: el
 *   encabezado lo lee de aquí porque `column.getFilterValue()` no es reactivo
 *   (la `column` de TanStack conserva su identidad y el React Compiler cachea
 *   la lectura por esa identidad).
 * - `server-pagination`: la prop obsoleta `serverPagination`. La tabla solo
 *   tiene la página actual, así que un filtro de encabezado filtraría esa
 *   página y nada más.
 * - `server`: la prop `server`. Filtros, búsqueda, orden y paginación los
 *   resuelve el backend; `filters` es el estado de los filtros de encabezado.
 */
export type DataTableModeContextValue =
  | {
      mode: "client";
      columnFilters?: ColumnFiltersState;
      /**
       * El encabezado avisa aquí la ETIQUETA del valor elegido en su filtro
       * (`undefined` al quitarlo): `DataTable` solo conoce el valor crudo y la
       * necesita para el chip de "Filtrado por" sobre la tabla.
       */
      reportFilterValueLabel?: (columnId: string, label: string | undefined) => void;
    }
  | { mode: "server-pagination" }
  | { mode: "server"; filters: DataTableServerFilters | undefined };

export const CLIENT_TABLE_MODE: DataTableModeContextValue = { mode: "client" };
export const SERVER_PAGINATION_TABLE_MODE: DataTableModeContextValue = {
  mode: "server-pagination",
};

/**
 * Lo lee `ColumnHeaderFilter`. Hace falta un contexto —y no leer el estado de
 * la columna de TanStack— por dos motivos: el filtro debe saber si puede
 * pintarse (en `server-pagination` no), y en modo servidor el valor activo vive
 * fuera de TanStack.
 */
export const DataTableModeContext =
  createContext<DataTableModeContextValue>(CLIENT_TABLE_MODE);
