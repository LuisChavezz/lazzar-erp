import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { formatShortDateTime } from "@/src/utils/formatDate";
import {
  isPurchaseOrderBalanceClosed,
  isPurchaseOrderCancelled,
} from "../constants/purchaseOrderStatus";
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

/**
 * Banner de estatus del PDF de la OC (EC-947): solo una Recibida con el saldo
 * cerrado lo lleva, con la fecha del cierre. NUNCA el `motivo_cierre`: es una
 * nota interna y este mismo PDF es el adjunto de "Enviar correo" al proveedor
 * (`generatePurchaseOrderPdfBlob`); el motivo solo se ve en el detalle en
 * pantalla. La cancelada usa la marca de cancelación del descriptor, que gana
 * al banner en la plantilla.
 */
export const purchaseOrderPdfStatusBanner = (
  order: Pick<PurchaseOrder, "estatus" | "saldo_cerrado" | "fecha_cierre">,
): { title: string; detail: string | null } | null => {
  if (!isPurchaseOrderBalanceClosed(order)) return null;
  return {
    title: "SALDO CERRADO",
    detail: order.fecha_cierre ? `Cerrado el ${formatShortDateTime(order.fecha_cierre)}.` : null,
  };
};
