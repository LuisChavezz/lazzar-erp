import type { DataTableFilterOption } from "@/src/components/DataTable";
import type { PurchaseOrderReceipt } from "../interfaces/purchase-order-receipt.interface";

// ─── Opciones de filtro por columna ─────────────────────────────────────────
// Alimentan los desplegables dentro de los encabezados de Folio (Estatus) y
// Proveedor (ver `PurchaseOrderReceiptColumns.tsx`) — mismo estándar que
// `PurchaseOrdersFilter.tsx`.

/**
 * Opciones de estatus a partir de las recepciones cargadas. El listado
 * (`GET /compras/recepciones/`) NO trae `estatus_label` — solo el detalle lo
 * expone (ver `receiptStatus.ts`) — así que la etiqueta es el propio código
 * ("Estatus 2"), no un texto de negocio: es honesto con el dato disponible
 * en vez de adivinar un mapeo que podría estar mal.
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
    .map((estatus) => ({ value: String(estatus), label: `Estatus ${estatus}` }));
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
