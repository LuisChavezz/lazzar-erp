import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { Packing } from "../interfaces/packing.interface";
import { getPackingDetail } from "../services/actions";
import { packingPdfDescriptor } from "./packingPdf";

/**
 * Fuente del PDF de un embarque (EC-858). El detalle se lee FRESCO con el
 * servicio, sin pasar por la caché del listado ni por `["packing-detail", id]`,
 * la que observa `PackingDetailByIdDialog` (regla de `renderedDocumentPdfSource`).
 */
export const packingPdfSource = (options: {
  packingId: number;
  /** Arma el Blob; el botón pasa `generatePackingPdfBlob`, las pruebas uno falso. */
  render: (packing: Packing, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getPackingDetail(options.packingId),
    describe: packingPdfDescriptor,
    render: (packing, { company }) => options.render(packing, company),
  });
