/**
 * PDF del listado exportado (EC-959): de las filas y las columnas visibles a las
 * props de `ListPdfDocument` (variante `standard`). Sin React ni react-pdf, para
 * probarlo en `tests/unit/`; lo usa `usePurchaseOrderReceiptPdfExport`.
 */
import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { getPurchaseOrderReceiptColumnText } from "./purchaseOrderReceiptExport";
import { listPdfWidths, standardListPdfProps } from "@/src/utils/listPdfBlob";

/** Ancho relativo de cada columna en el PDF — Folio/Proveedor llevan texto más largo. */
const getColumnWeight = (column: DataTableVisibleColumn<PurchaseOrderReceipt>): number => {
  if (column.id === "folio") return 1.6;
  if (column.id === "proveedor_nombre") return 1.6;
  return 1;
};

/** Props del PDF del listado: variante `standard` de `ListPdfDocument` (EC-959). */
export const purchaseOrderReceiptsPdfProps = (
  receipts: PurchaseOrderReceipt[],
  columns: DataTableVisibleColumn<PurchaseOrderReceipt>[],
  now: Date,
) => {
  const widths = listPdfWidths(columns.map(getColumnWeight), 1);
  return standardListPdfProps({
    title: "Reporte de Recepciones",
    columns: columns.map((column, i) => ({ header: column.header, width: widths[i] })),
    rows: receipts.map((receipt) => columns.map((column) => getPurchaseOrderReceiptColumnText(receipt, column))),
    now,
  });
};
