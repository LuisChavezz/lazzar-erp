"use client";

import type { Column } from "@tanstack/react-table";
import { ColumnHeaderDateRangeFilter } from "@/src/components/ColumnHeaderDateRangeFilter";
import { FilterHeader, type ColumnFilterOption } from "@/src/components/ColumnHeaderFilter";
import { ALL_FILTER_OPTION } from "@/src/utils/columnFilterOptions";
import { purchaseOrderStatusEntry } from "../constants/purchaseOrderStatus";
import { PURCHASE_ORDER_ESTATUS_VALUES } from "../hooks/usePurchaseOrdersTable";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

/**
 * Encabezados con filtro del listado de órdenes de compra (modo servidor).
 * Las opciones son FIJAS o salen de un catálogo, nunca de las filas: la tabla
 * solo tiene la página actual. El filtro por proveedor es el compartido
 * `SupplierCatalogHeaderFilter`.
 */

type PurchaseOrderColumn = Column<PurchaseOrder, unknown>;

/** Los seis estatus del backend, con su punto de color: el menú es la leyenda. */
const ESTATUS_OPTIONS: ColumnFilterOption[] = [
  ALL_FILTER_OPTION,
  ...PURCHASE_ORDER_ESTATUS_VALUES.map((estatus) => {
    const entry = purchaseOrderStatusEntry(Number(estatus));
    return { value: estatus, label: entry.label ?? estatus, dotClassName: entry.dot };
  }),
];

/** "O.C.": el estatus vive en esta columna (el punto junto al folio). */
export function PurchaseOrderFolioHeader({ column }: { column: PurchaseOrderColumn }) {
  return <FilterHeader title="O.C." column={column} options={ESTATUS_OPTIONS} label="estatus" />;
}

/** "Fecha de generación": rango libre sobre `fecha_oc`. */
export function PurchaseOrderFechaOcHeader() {
  return (
    <div className="flex items-center gap-1.5">
      <span>Fecha de generación</span>
      <ColumnHeaderDateRangeFilter
        label="fecha de generación"
        fromKey="fecha_desde"
        toKey="fecha_hasta"
      />
    </div>
  );
}
