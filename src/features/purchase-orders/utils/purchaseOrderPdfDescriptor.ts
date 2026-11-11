import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { isPurchaseOrderCancelled } from "../constants/purchaseOrderStatus";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";

/**
 * Identidad de una orden de compra para su PDF (EC-855). Se descarga en los
 * seis estatus; solo la CANCELADA (6) lleva la marca, con su
 * `motivo_cancelacion`. `folio` es `null` hasta confirmarla: la plantilla
 * muestra `#id` y el archivo se llama `OC-ID<id>.pdf`.
 */
export const purchaseOrderPdfDescriptor = (
  order: Pick<PurchaseOrder, "id" | "folio" | "estatus" | "motivo_cancelacion">,
): DocumentPdfDescriptor => ({
  type: "OC",
  id: order.id,
  folio: order.folio,
  cancelled: isPurchaseOrderCancelled(order.estatus),
  cancellationReason: order.motivo_cancelacion,
});
