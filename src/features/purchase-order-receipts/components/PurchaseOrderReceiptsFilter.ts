import type { DataTableFilterOption } from "@/src/components/DataTable";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";
import { getReceiptEstatusLabel } from "@/src/features/receipts/constants/receiptStatus";

// ─── Opciones de filtro por columna ─────────────────────────────────────────
// Alimentan los desplegables dentro de los encabezados de Folio (Estatus) y
// Proveedor (ver `PurchaseOrderReceiptColumns.tsx`) — mismo estándar que
// `PurchaseOrdersFilter.tsx`.

/**
 * Opciones de estatus a partir de las recepciones cargadas. El listado
 * (`GET /compras/recepciones/`) solo trae el código; la etiqueta sale del
 * mismo mapa del enum `Recepcion.EstatusRecepcion` que usa WMS
 * (`getReceiptEstatusLabel`). El VALOR sigue siendo el código, que es lo que
 * compara `exactFilterFn`.
 */
export function buildReceiptStatusOptions(
  receipts: PurchaseOrderReceipt[],
): DataTableFilterOption[] {
  const values = new Set<number>();
  for (const receipt of receipts) {
    values.add(receipt.estatus);
  }
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((estatus) => ({ value: String(estatus), label: getReceiptEstatusLabel(estatus) }));
}

/** Construye las opciones de proveedor a partir de las recepciones cargadas. */
export function buildReceiptSupplierOptions(
  receipts: PurchaseOrderReceipt[],
): DataTableFilterOption[] {
  const map = new Map<number, string>();
  for (const receipt of receipts) {
    if (!map.has(receipt.proveedor)) {
      map.set(receipt.proveedor, receipt.proveedor_nombre);
    }
  }
  return Array.from(map.entries())
    .sort(([, a], [, b]) => a.localeCompare(b))
    .map(([id, nombre]) => ({ value: String(id), label: nombre }));
}
