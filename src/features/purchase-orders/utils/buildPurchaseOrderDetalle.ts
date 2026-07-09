import type { PurchaseOrderDetalleItem } from "../interfaces/purchase-order-onboarding.interface";

/**
 * Arma el arreglo `detalle` (renglones de producto) a partir del estado de
 * selección compartido por los Step 2 de alta y edición: `quantities`
 * (id de producto → cantidad) y `prices` (id de producto → precio en texto).
 *
 * La descripción de cada renglón se resuelve vía `resolveDescripcion`, ya que
 * las dos llamadas difieren ahí: alta solo consulta el catálogo, mientras que
 * edición primero intenta el renglón sembrado de la orden (`seedById`) antes
 * de caer al catálogo.
 */
export function buildPurchaseOrderDetalle(
  quantities: Record<number, number>,
  prices: Record<number, string>,
  resolveDescripcion: (productoId: number) => string,
): PurchaseOrderDetalleItem[] {
  return Object.entries(quantities).map(([productoIdStr, cantidad]) => {
    const productoId = Number(productoIdStr);
    return {
      producto: productoId,
      cantidad,
      precio: parseFloat(prices[productoId] ?? "").toFixed(2),
      descripcion: resolveDescripcion(productoId),
    };
  });
}
