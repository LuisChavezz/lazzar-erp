/**
 * Identidad del PDF de la orden de corte de manga (EC-857). Módulo puro, sin
 * React ni `@react-pdf/renderer`, para probarlo en `tests/unit/`.
 */
import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { cancellationPdfFields } from "@/src/features/document-cancellation/utils/cancellationPdf";
import { isWorkOrderTerminal } from "@/src/utils/workOrderStatusEdit";
import type { CorteMangaOrder } from "../interfaces/corte-manga-order.interface";

/**
 * Identidad de una OCM para su PDF. La CANCELADA (7) se sigue pudiendo
 * consultar y lleva la marca de la base, con su motivo, quién y cuándo
 * (`cancelar/`, nucleo-erp#1355, EC-948) si los trae. Una OCM dada de baja
 * responde 404 y no llega aquí.
 */
export const corteMangaOrderPdfDescriptor = (
  order: Pick<CorteMangaOrder, "id" | "folio_ocm" | "estatus_corte" | "motivo_cancelacion" | "fecha_cancelacion" | "cancelado_por_nombre">,
): DocumentPdfDescriptor => {
  const cancelled = isWorkOrderTerminal(order.estatus_corte);
  return {
    type: "OCM",
    id: order.id,
    folio: order.folio_ocm,
    cancelled,
    ...cancellationPdfFields(cancelled, order),
  };
};
