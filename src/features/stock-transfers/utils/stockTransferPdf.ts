import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { TransferenciaListItem } from "../interfaces/stock-transfer.interface";

/**
 * Leyenda de la marca de un traspaso que no se completó (EC-858): el backend
 * distingue el cancelado (`CANCELADA`) del que falló (`FALLIDA`), y el PDF dice
 * cuál fue. Los demás estatus no llevan marca.
 */
const TRANSFER_PDF_MARKS: Partial<Record<string, string>> = {
  CANCELADA: "CANCELADA",
  FALLIDA: "FALLIDA",
};

/**
 * Identidad de un traspaso para su PDF (EC-858): código `TR`; sus folios ya
 * empiezan con `TR` (`TR-00033.pdf`), así que no hace falta alias de serie.
 */
export const stockTransferPdfDescriptor = (
  transfer: Pick<TransferenciaListItem, "id" | "folio" | "status">,
): DocumentPdfDescriptor => {
  const mark = transfer.status ? TRANSFER_PDF_MARKS[transfer.status] : undefined;
  return {
    type: "TR",
    id: transfer.id,
    folio: transfer.folio,
    cancelled: mark !== undefined,
    ...(mark ? { cancelledLabel: mark } : {}),
  };
};
