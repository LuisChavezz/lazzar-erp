/**
 * PDF del listado exportado (EC-959): de las filas y las columnas visibles a las
 * props de `ListPdfDocument` (variante `standard`). Sin React ni react-pdf, para
 * probarlo en `tests/unit/`; lo usa `usePurchaseOrderPdfExport`.
 */
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { getPurchaseOrderColumnText } from "./purchaseOrderExport";
import { listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";

/** Ancho relativo de cada columna en el PDF — O.C./Proveedor llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<PurchaseOrder>): number => {
  if (column.id === "folio") return 1.8;
  if (column.id === "proveedor_nombre") return 1.8;
  if (column.id === "progreso") return 1.6;
  return 1;
};

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
export const purchaseOrdersPdfProps = (
  orders: PurchaseOrder[],
  columns: DataTableVisibleColumn<PurchaseOrder>[],
  now: Date,
) => {
  const widths = listPdfWidths(columns.map(getColumnWeight), 1);
  return standardListPdfProps({
    title: "Reporte de Órdenes de Compra",
    columns: columns.map((column, i) => ({ header: column.header, width: widths[i] })),
    rows: orders.map((order) => columns.map((column) => getPurchaseOrderColumnText(order, column))),
    now,
  });
};
