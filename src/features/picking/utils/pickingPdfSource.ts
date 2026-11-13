import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { Picking } from "../interfaces/picking.interface";
import { getPickingDetail } from "../services/actions";
import { pickingPdfDescriptor } from "./pickingPdf";

/**
 * Fuente del PDF de un surtido (EC-858). El detalle se lee FRESCO con el
 * servicio, sin pasar por la caché del listado ni por `["picking-detail", id]`,
 * la que observa `PickingDetailByIdDialog` (regla de `renderedDocumentPdfSource`).
 */
export const pickingPdfSource = (options: {
  pickingId: number;
  /** Arma el Blob; el botón pasa `generatePickingPdfBlob`, las pruebas uno falso. */
  render: (picking: Picking, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getPickingDetail(options.pickingId),
    describe: pickingPdfDescriptor,
    render: (picking, { company }) => options.render(picking, company),
  });
