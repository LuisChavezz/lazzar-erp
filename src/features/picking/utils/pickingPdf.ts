import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { Picking } from "../interfaces/picking.interface";
import { wmsPdfCancellationReason } from "@/src/features/wms-cancellations/utils/wmsPdfCancellationReason";

/**
 * Identidad de un surtido (picking) para su PDF (EC-858): código `PCK`, que
 * reconoce la serie `PICK` de sus folios (`PICK-000038.pdf`). Un picking
 * `"Cancelado"` lleva la marca de cancelado y su `motivo_cancelacion` (EC-945).
 */
export const pickingPdfDescriptor = (
  picking: Pick<Picking, "id" | "folio" | "estado" | "motivo_cancelacion">,
): DocumentPdfDescriptor => {
  const cancelled = picking.estado === "Cancelado";
  return {
    type: "PCK",
    id: picking.id,
    folio: picking.folio,
    cancelled,
    ...wmsPdfCancellationReason(cancelled, picking.motivo_cancelacion),
  };
};
