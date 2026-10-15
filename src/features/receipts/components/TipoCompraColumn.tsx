"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ColumnHeaderFilter } from "@/src/components/ColumnHeaderFilter";
import { textOrDash } from "@/src/components/DetailDialogPrimitives";
import {
  TIPO_COMPRA_OPTIONS,
  tipoCompraLabel,
  type TipoCompra,
} from "@/src/features/purchase-orders/constants/purchaseOrderTipoCompra";

/**
 * Columna "Tipo de compra" de los listados de recepciones (WMS y Compras).
 *
 * - Muestra (y la búsqueda global lee) la ETIQUETA; el accessor siempre
 *   devuelve string (`""` para `null`) por el bug de
 *   `getColumnCanGlobalFilter`/`flatRows[0]` que documenta
 *   `CorteMangaOrderColumns.tsx`.
 * - El filtro de encabezado compara el código crudo con opciones FIJAS (todos
 *   los valores del backend), no deducidas de las filas.
 * - Filtro vacío = sin filtro, así que las recepciones OP (`null`, sin OC)
 *   siguen visibles con "Todos" y quedan fuera al elegir MP/PT.
 *
 * El `id` es `orden_compra_tipo_compra`: el export de Compras
 * (`purchaseOrderReceiptExport.ts`) lo reconoce por ese id.
 */
export const createTipoCompraColumn = <
  T extends { orden_compra_tipo_compra: TipoCompra | null },
>(): ColumnDef<T> => ({
  id: "orden_compra_tipo_compra",
  accessorFn: (row) =>
    row.orden_compra_tipo_compra ? tipoCompraLabel(row.orden_compra_tipo_compra) : "",
  meta: { label: "Tipo de compra" },
  header: ({ column }) => (
    <div className="flex items-center gap-1.5">
      <span>Tipo de compra</span>
      <ColumnHeaderFilter
        column={column}
        options={[{ value: undefined, label: "Todos" }, ...TIPO_COMPRA_OPTIONS]}
        label="tipo de compra"
      />
    </div>
  ),
  filterFn: (row, _columnId, filterValue: string | undefined) =>
    !filterValue || row.original.orden_compra_tipo_compra === filterValue,
  cell: (info) => (
    <span className="text-slate-600 dark:text-slate-300">
      {textOrDash(info.getValue<string>())}
    </span>
  ),
});
