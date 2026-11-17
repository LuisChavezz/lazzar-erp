import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { Cobro } from "../interfaces/collection.interface";

/**
 * Identidad de un cobro para su PDF (EC-859): código `COB`. Sus folios de la
 * serie COBROS ya traen el segmento (`COB-00016.pdf`); un `Borrador` aún no
 * tiene folio (`COB-ID<id>.pdf`). La marca sale solo con `Cancelado` y dice
 * "CANCELADO".
 */
export const cobroPdfDescriptor = (cobro: Pick<Cobro, "id" | "folio" | "estatus">): DocumentPdfDescriptor => {
  const cancelled = cobro.estatus === "Cancelado";
  return { type: "COB", id: cobro.id, folio: cobro.folio, cancelled };
};
