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
  "home",
] as const;

export type PedidoDetailOrigin = (typeof PEDIDO_DETAIL_ORIGINS)[number];

/**
 * Estrecha el `?from=` crudo de la URL. Compara contra el arreglo (no contra
 * las llaves de un objeto), así que `constructor`/`toString` no pasan.
 */
export function isPedidoDetailOrigin(value: string | undefined): value is PedidoDetailOrigin {
  return value !== undefined && (PEDIDO_DETAIL_ORIGINS as readonly string[]).includes(value);
}
