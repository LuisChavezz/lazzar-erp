import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { Packing } from "../interfaces/packing.interface";
import { wmsPdfCancellationReason } from "@/src/features/wms-cancellations/utils/wmsPdfCancellationReason";

/**
 * Identidad de un embarque (packing) para su PDF (EC-858): código `PAK`, que
 * reconoce la serie `PACK` de sus folios (`PACK-000017.pdf`). Un packing
 * `"CANCELADO"` lleva la marca de cancelado y su `motivo_cancelacion` (EC-945).
 */
export const packingPdfDescriptor = (
  packing: Pick<Packing, "id" | "folio" | "estado" | "motivo_cancelacion">,
): DocumentPdfDescriptor => {
  const cancelled = packing.estado === "CANCELADO";
  return {
    type: "PAK",
    id: packing.id,
    folio: packing.folio,
    cancelled,
    ...wmsPdfCancellationReason(cancelled, packing.motivo_cancelacion),
  };
};
