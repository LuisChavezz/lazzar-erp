import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { Packing } from "../interfaces/packing.interface";

/**
 * Identidad de un embarque (packing) para su PDF (EC-858): código `PAK`, que
 * reconoce la serie `PACK` de sus folios (`PACK-000017.pdf`). Un packing
 * `"CANCELADO"` lleva la marca de cancelado, sin motivo: el modelo no guarda uno.
 */
export const packingPdfDescriptor = (
  packing: Pick<Packing, "id" | "folio" | "estado">,
): DocumentPdfDescriptor => ({
  type: "PAK",
  id: packing.id,
  folio: packing.folio,
  cancelled: packing.estado === "CANCELADO",
});
