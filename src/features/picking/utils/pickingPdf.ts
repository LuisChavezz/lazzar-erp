import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { Picking } from "../interfaces/picking.interface";

/**
 * Identidad de un surtido (picking) para su PDF (EC-858): código `PCK`, que
 * reconoce la serie `PICK` de sus folios (`PICK-000038.pdf`). Un picking
 * `"Cancelado"` lleva la marca de cancelado, sin motivo: el modelo no guarda
 * uno (si lo hay, quedó en `observaciones`, que el PDF imprime aparte).
 */
export const pickingPdfDescriptor = (
  picking: Pick<Picking, "id" | "folio" | "estado">,
): DocumentPdfDescriptor => ({
  type: "PCK",
  id: picking.id,
  folio: picking.folio,
  cancelled: picking.estado === "Cancelado",
});
