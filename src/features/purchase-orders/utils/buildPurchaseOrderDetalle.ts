import type { PurchaseOrderDetalleItem } from "../interfaces/purchase-order-onboarding.interface";
import type { PurchaseOrderLinesData } from "../hooks/usePurchaseOrderLines";

/**
 * Arma el arreglo `detalle` (renglones) a partir del estado de selección
 * compartido por los Step 2 de alta y edición (ver `usePurchaseOrderLines`).
 *
 * Un renglón con variante viaja SOLO con `producto_variante` (el backend deduce
 * el producto); el resto —materia prima y renglones de PT "Sin SKU"— con
 * `producto`, como siempre.
 */
export function buildPurchaseOrderDetalle({
  lines,
  quantities,
  prices,
}: PurchaseOrderLinesData): PurchaseOrderDetalleItem[] {
  return lines.map((line) => {
    const base = {
      cantidad: quantities[line.key] ?? 1,
      precio: parseFloat(prices[line.key] ?? "").toFixed(2),
      descripcion: line.descripcion,
    };
    return line.productoVariante !== null
      ? { ...base, producto_variante: line.productoVariante }
      : { ...base, producto: line.producto };
  });
}
