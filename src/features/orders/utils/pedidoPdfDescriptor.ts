import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { PEDIDO_ESTATUS } from "../constants/pedidoStatus";
import type { Order } from "../interfaces/order.interface";

/**
 * Identidad de un pedido para su PDF (EC-856). `folio` es `null` mientras el
 * pedido no se autoriza: la plantilla muestra `#id` y el archivo se llama
 * `PED-ID<id>.pdf`.
 *
 * Marca de cancelado: solo la llevaría un CANCELADO (5) que el detalle todavía
 * devuelva, es decir, uno anterior a `/cancelar/` que conserva `activo = true`.
 * Uno cancelado con `/cancelar/` queda con `activo = false` y su detalle
 * responde 404, así que nunca llega aquí. El pedido no guarda el motivo (solo
 * vive en la auditoría), por eso no se pasa `cancellationReason`.
 */
export const pedidoPdfDescriptor = (
  pedido: Pick<Order, "id" | "folio" | "estatus">,
): DocumentPdfDescriptor => ({
  type: "PED",
  id: pedido.id,
  folio: pedido.folio,
  cancelled: pedido.estatus === PEDIDO_ESTATUS.CANCELADO,
});
