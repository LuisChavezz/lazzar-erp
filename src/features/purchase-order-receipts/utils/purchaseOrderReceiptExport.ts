import type { DataTableVisibleColumn } from "@/src/components/DataTable";
import { formatLocalDate } from "@/src/utils/formatDate";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

/**
 * Texto plano por columna para los reportes CSV y PDF del listado
 * (`usePurchaseOrderReceiptCsvExport`/`usePurchaseOrderReceiptPdfExport`). La
 * columna "folio" es un widget compuesto pensado para pantalla (punto de
 * estatus + folio + remisión, ver `PurchaseOrderReceiptColumns`), no para una
 * celda de reporte — aquí se arma su propia representación de texto por
 * `column.id`. Mismo criterio que `purchaseOrderExport.ts`.
 */
export const getPurchaseOrderReceiptColumnText = (
  receipt: PurchaseOrderReceipt,
  column: DataTableVisibleColumn<PurchaseOrderReceipt>,
): string => {
  switch (column.id) {
    case "folio":
      return [receipt.folio || "—", `Estatus ${receipt.estatus}`, receipt.remision || null]
        .filter(Boolean)
        .join(" · ");
    case "fecha_recepcion":
      return formatLocalDate(receipt.fecha_recepcion);
    default:
      return String((receipt as unknown as Record<string, unknown>)[column.id] ?? "");
  }
};
