/**
 * Orígenes válidos del detalle 360° del pedido (`/orders/[id]?from=<origen>`).
 *
 * Cada llave nombra el listado o página que enlazó al detalle y decide a dónde
 * vuelve su "Volver" (`BACK_TARGETS` en `PedidoDetailContent`, tipado con
 * `Record<PedidoDetailOrigin, …>` para que cada origen tenga destino). Vive en
 * su propio módulo para que las columnas (`PedidoFolioLink`) y el detalle lo
 * importen sin depender uno del otro.
 */
export const PEDIDO_DETAIL_ORIGINS = [
  "operations",
  "scheduled-orders",
  "wms",
  "picking",
  "packing",
  "shipping",
  "procurement",
  "sales",
  "embroidery",
  "reflective",
  "corte-manga",
  "production-orders",
  "purchase-orders",
  "customers",
  "invoice",
  "home",
] as const;

export type PedidoDetailOrigin = (typeof PEDIDO_DETAIL_ORIGINS)[number];

/**
 * Parámetros que acompañan al origen `invoice`: la factura a la que vuelve
 * "Volver" y la hoja en que estaba. Se validan en `PedidoDetailContent`.
 */
export const INVOICE_ORIGIN_ID_PARAM = "factura";
export const INVOICE_ORIGIN_SHEET_PARAM = "factura_sheet";

/**
 * Estrecha el `?from=` crudo de la URL. Compara contra el arreglo (no contra
 * las llaves de un objeto), así que `constructor`/`toString` no pasan.
 */
export function isPedidoDetailOrigin(value: string | undefined): value is PedidoDetailOrigin {
  return value !== undefined && (PEDIDO_DETAIL_ORIGINS as readonly string[]).includes(value);
}
