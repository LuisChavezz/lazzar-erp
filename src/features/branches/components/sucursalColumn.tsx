"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { HeaderFilterSpec } from "@/src/components/withHeaderFilters";

/** Lo que una fila necesita para la columna: el FK y el nombre que resuelve el backend. */
type ConSucursal = { sucursal: number | null; sucursal_nombre: string | null };

/** Opción del filtro para las filas sin sucursal. */
export const SIN_SUCURSAL_LABEL = "Sin sucursal";

/**
 * Columna "Sucursal" de los listados cuyo backend ya resuelve `sucursal_nombre`
 * (cobros y pagos, EC-866). Mismo criterio que `createTipoCompraColumn`:
 *
 * - Muestra (y la búsqueda global lee) el NOMBRE, como el resto de listados de
 *   la app; el accessor siempre devuelve string (`""` para `null`) por el bug de
 *   `getColumnCanGlobalFilter`/`flatRows[0]` que documenta
 *   `CorteMangaOrderColumns.tsx`.
 * - Sin sucursal, la celda pinta «—» y la búsqueda no indexa un texto inventado.
 *
 * El `id` es `sucursal_nombre`, la llave de `sucursalHeaderFilter` en el mapa de
 * filtros que recibe `withHeaderFilters`.
 */
export const createSucursalColumn = <T extends ConSucursal>(
  options: { size?: number } = {},
): ColumnDef<T, unknown> => ({
  id: "sucursal_nombre",
  accessorFn: (row) => row.sucursal_nombre ?? "",
  header: "Sucursal",
  ...(options.size !== undefined && { size: options.size }),
  cell: (info) => (
    <span className="text-slate-500 dark:text-slate-400">
      {info.getValue<string>() || "—"}
    </span>
  ),
});

/**
 * Filtro de encabezado de `createSucursalColumn`: compara el FK crudo
 * `sucursal` y rotula cada opción con `sucursal_nombre` (dos sucursales
 * homónimas no se mezclan). Las filas sin sucursal no forman opción propia
 * —`buildDistinctFilterOptions` salta los `null`— y se eligen con
 * "Sin sucursal".
 */
export const sucursalHeaderFilter = <T extends ConSucursal>(): HeaderFilterSpec<T> => ({
  type: "distinct",
  get: (r) => r.sucursal,
  label: (r) => r.sucursal_nombre,
  emptyOption: SIN_SUCURSAL_LABEL,
});
