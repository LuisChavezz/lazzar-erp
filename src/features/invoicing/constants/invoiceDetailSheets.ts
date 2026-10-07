/**
 * Hojas del detalle de factura (`/finance/invoicing/[id]`), mismo mecanismo que
 * las del detalle de pedido (`orderDetailSheets`): la hoja activa vive en la
 * URL (`?sheet=`) para que sobreviva a la recarga y se pueda compartir.
 *
 * - `invoice` ("Factura"): la factura en sí. Hoja por defecto; NO se escribe
 *   en la URL.
 * - `tracking` ("Seguimiento"): avance del pedido, parcialidades, cobranza y
 *   notas de crédito.
 *
 * Cualquier otro valor (o ninguno) cae en `invoice`.
 */
export const INVOICE_DETAIL_SHEET_PARAM = "sheet";

export const INVOICE_DETAIL_SHEETS = ["invoice", "tracking"] as const;

export type InvoiceDetailSheet = (typeof INVOICE_DETAIL_SHEETS)[number];

export const DEFAULT_INVOICE_DETAIL_SHEET: InvoiceDetailSheet = "invoice";

/** Valor crudo de la URL → hoja. Desconocido o ausente → hoja por defecto. */
export function resolveInvoiceDetailSheet(value: string | undefined): InvoiceDetailSheet {
  // Contra la lista y no contra un objeto: `?sheet=constructor` no resuelve a
  // nada heredado de `Object.prototype`.
  return (INVOICE_DETAIL_SHEETS as readonly string[]).includes(value ?? "")
    ? (value as InvoiceDetailSheet)
    : DEFAULT_INVOICE_DETAIL_SHEET;
}
