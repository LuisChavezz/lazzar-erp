import { isPurchaseOrderAuthorizedOrComplete } from "../constants/purchaseOrderStatus";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
import { canSeeAmounts } from "./purchaseOrderFinance";

export type PurchaseOrderEmailBlockReason = "status" | "amounts";

export interface PurchaseOrderEmailBlocker {
  reason: PurchaseOrderEmailBlockReason;
  message: string;
}

/**
 * Por qué una orden de compra NO puede enviarse por correo al proveedor, o
 * `null` si puede. Se evalúa sobre el DETALLE recién consultado (nunca sobre
 * la fila del listado) al preparar el correo y otra vez al enviarlo
 * (`useSendPurchaseOrderEmail`). En orden:
 *
 * - `status`: el estatus real ya no es 3, 4 o 5. La fila que habilitó "Enviar
 *   correo" puede estar desactualizada: si otro usuario canceló o editó la
 *   orden (regresa a pendiente), le llegaría al proveedor una orden que ya no
 *   está en firme —y, si está cancelada, con la leyenda "CANCELADA" en el
 *   adjunto—. Quien llama refresca el listado para que la fila muestre su
 *   estatus real.
 * - `amounts`: el rol no puede ver los importes. El detalle ya viene filtrado
 *   por rol, y sin precios el correo y su PDF serían un documento roto.
 */
export function getPurchaseOrderEmailBlocker(
  order: PurchaseOrderDetail,
): PurchaseOrderEmailBlocker | null {
  if (!isPurchaseOrderAuthorizedOrComplete(order.estatus)) {
    return {
      reason: "status",
      message:
        "El estatus de esta orden cambió y ya no puede enviarse por correo. Se actualizó el listado.",
    };
  }
  if (!canSeeAmounts(order)) {
    return {
      reason: "amounts",
      message:
        "No tienes acceso a los importes de esta orden, así que no puede enviarse al proveedor.",
    };
  }
  return null;
}
