import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { Cobro } from "../interfaces/collection.interface";
import { getCobro } from "../services/actions";
import { cobroPdfDescriptor } from "./cobroPdf";

/**
 * Fuente del PDF de un cobro (EC-859). El diálogo pinta la fila del listado;
 * el PDF pide el retrieve FRESCO con el servicio, sin tocar `["cobros"]`
 * (regla de `renderedDocumentPdfSource`).
 */
export const cobroPdfSource = (options: {
  cobroId: number;
  /** Arma el Blob; el botón pasa `generateCobroPdfBlob`, las pruebas uno falso. */
  render: (cobro: Cobro, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getCobro(options.cobroId),
    describe: cobroPdfDescriptor,
    render: (cobro, { company }) => options.render(cobro, company),
  });
