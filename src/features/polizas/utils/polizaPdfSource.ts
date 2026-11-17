import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { Poliza } from "../interfaces/poliza.interface";
import { getPoliza } from "../services/actions";
import { polizaPdfDescriptor } from "./polizaPdf";

/**
 * Fuente del PDF de una póliza (EC-859). El diálogo pinta la fila del listado;
 * el PDF pide el retrieve FRESCO con el servicio, sin tocar `["polizas"]`
 * (regla de `renderedDocumentPdfSource`).
 */
export const polizaPdfSource = (options: {
  polizaId: number;
  /** Arma el Blob; el botón pasa `generatePolizaPdfBlob`, las pruebas uno falso. */
  render: (poliza: Poliza, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getPoliza(options.polizaId),
    describe: polizaPdfDescriptor,
    render: (poliza, { company }) => options.render(poliza, company),
  });
