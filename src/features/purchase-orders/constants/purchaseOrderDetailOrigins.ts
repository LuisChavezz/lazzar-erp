/**
 * Orígenes válidos del detalle de una orden de compra
 * (`/procurement/purchase-orders/[id]?from=<origen>`), mismo patrón que
 * `pedidoDetailOrigins` del detalle de pedido.
 *
 * Cada llave nombra el listado que enlazó al detalle y decide a dónde vuelve su
 * "Volver" (`BACK_TARGETS` en `PurchaseOrderPageContent`). Sin `from` o con uno
 * desconocido se vuelve al listado de órdenes de compra. Nunca se navega a una
 * URL tomada de la query: solo a los destinos fijos del mapa.
 */
export const PURCHASE_ORDER_DETAIL_ORIGINS = ["purchase-order-receipts"] as const;

export type PurchaseOrderDetailOrigin = (typeof PURCHASE_ORDER_DETAIL_ORIGINS)[number];

/**
 * Estrecha el `?from=` crudo de la URL. Compara contra el arreglo (no contra
 * las llaves de un objeto), así que `constructor`/`toString` no pasan.
 */
export function isPurchaseOrderDetailOrigin(
  value: string | undefined,
): value is PurchaseOrderDetailOrigin {
  return (
    value !== undefined &&
    (PURCHASE_ORDER_DETAIL_ORIGINS as readonly string[]).includes(value)
  );
}

/**
 * URL del detalle de una OC. `from` tipado con `PurchaseOrderDetailOrigin`: un
 * origen mal escrito no compila, en vez de caer en silencio al "Volver" por
 * defecto (misma intención que `PedidoFolioLink` con `PedidoDetailOrigin`).
 */
export const purchaseOrderDetailHref = (
  id: number,
  from?: PurchaseOrderDetailOrigin,
): string =>
  from ? `/procurement/purchase-orders/${id}?from=${from}` : `/procurement/purchase-orders/${id}`;
