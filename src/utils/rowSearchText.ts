import type { FilterFn, TableOptions } from "@tanstack/react-table";

/**
 * Separador entre los campos del texto de búsqueda de una fila. Un salto de
 * línea no se escribe en el buscador, así que una búsqueda nunca empata a
 * caballo entre dos campos ("LAZZAR JESUS" no encuentra razón social LAZZAR
 * con contacto JESUS), igual que la búsqueda por columnas de siempre.
 */
const FIELD_SEPARATOR = "\n";

/** Une los campos buscables de una fila, sin los vacíos. */
export const joinRowSearchText = (
  fields: readonly (string | number | null | undefined)[],
): string =>
  fields
    .filter((field) => field !== null && field !== undefined && field !== "")
    .map(String)
    .join(FIELD_SEPARATOR);

/**
 * Opciones de TanStack para que la búsqueda global en memoria de `DataTable`
 * compare contra un texto por FILA (`getRowSearchText`) en vez de contra el
 * valor de cada columna. Mismo criterio que el `includesString` por defecto:
 * contiene, sin distinguir mayúsculas.
 *
 * - `globalFilterFn` ignora la columna: TanStack la llama columna por columna
 *   y una fila pasa con la primera que dé `true`, así que basta con que dé el
 *   mismo resultado en todas.
 * - `getColumnCanGlobalFilter: () => true` evita la trampa del filtro por
 *   defecto (excluir una columna si su valor en la PRIMERA fila es `null`):
 *   aquí el texto no depende de la columna, así que ninguna debe quedar fuera.
 *   TanStack sigue excluyendo las columnas sin `accessorFn`.
 */
export const rowSearchTextTableOptions = <TData>(
  getRowSearchText: (row: TData) => string,
): Pick<TableOptions<TData>, "globalFilterFn" | "getColumnCanGlobalFilter"> => {
  const globalFilterFn: FilterFn<TData> = (row, _columnId, filterValue) =>
    getRowSearchText(row.original)
      .toLowerCase()
      .includes(String(filterValue ?? "").toLowerCase());
  return { globalFilterFn, getColumnCanGlobalFilter: () => true };
};
