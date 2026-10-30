import type { ColumnDef } from "@tanstack/react-table";

/**
 * Arnés de las pruebas de filtros de encabezado (`withHeaderFilters`): lee las
 * columnas ya envueltas sin renderizar nada — las opciones del `FilterHeader`
 * (`meta.headerFilter`), el `filterFn` y el accessor de cada columna.
 */

type Accessor<T> = { id?: string; accessorFn: (row: T, index: number) => unknown };

export function harness<T>(columns: ColumnDef<T, unknown>[], rows: T[]) {
  const column = (id: string) => {
    const found = columns.find((c) => c.id === id || (c as { accessorKey?: string }).accessorKey === id);
    if (!found) throw new Error(`sin columna ${id}`);
    return found;
  };
  return {
    column,
    options: (id: string) => column(id).meta?.headerFilter?.options ?? [],
    matching: (id: string, value: string) =>
      rows.filter((original) =>
        (column(id).filterFn as unknown as (row: { original: T }, columnId: string, value: unknown) => boolean)(
          { original },
          id,
          value,
        ),
      ),
    cellText: (id: string, row: T) => (column(id) as unknown as Accessor<T>).accessorFn(row, 0),
  };
}
