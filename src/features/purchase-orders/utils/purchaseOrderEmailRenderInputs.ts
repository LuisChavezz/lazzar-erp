import { isPurchaseOrderCancelled } from "../constants/purchaseOrderStatus";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
import { purchaseOrderEmailPayloadSchema } from "../schemas/purchase-order-email-payload.schema";

/**
 * Lo que se RENDERIZA del correo de una orden de compra y de su PDF adjunto,
 * para que el envío compare la versión confirmada con la recién leída
 * (`assertEmailSnapshotUnchanged`) sin abortar por cambios que no se ven:
 * avance de recepciones, auditoría, un estatus que sigue siendo enviable…
 *
 * - `email`: lo que recibe `PurchaseOrderEmail` y su asunto. El Route Handler
 *   valida el payload con este mismo esquema y le pasa a la plantilla lo
 *   validado; `z.object` descarta lo que no declara, así que es exactamente lo
 *   que la plantilla puede leer (incluido `proveedor_correo`, el destinatario).
 * - `pdf`: lo que `PurchaseOrderPdfDocument` lee FUERA de ese esquema. El resto
 *   de lo que pinta (cabecera, importes y renglones) ya está en `email`.
 *   El estatus solo decide si lleva la marca de cancelada, así que se compara
 *   esa marca y no el estatus (3 → 4 al recibir no cambia el documento).
 *   El bloque de entrega del PDF (`almacen_nombre`, `sucursal_direccion`,
 *   `sucursal_telefono`, EC-796) es el mismo que el del correo y ya viaja en
 *   `email`, así que no se repite aquí.
 */
export const purchaseOrderEmailRenderInputs = (order: PurchaseOrderDetail) => {
  const cancelled = isPurchaseOrderCancelled(order.estatus);
  return {
    email: purchaseOrderEmailPayloadSchema.parse(order),
    pdf: {
      tipo: order.tipo,
      cancelled,
      motivoCancelacion: cancelled ? order.motivo_cancelacion?.trim() || null : null,
      lineDescuentos: (order.detalles ?? []).map((detalle) => detalle.descuento),
    },
  };
};
