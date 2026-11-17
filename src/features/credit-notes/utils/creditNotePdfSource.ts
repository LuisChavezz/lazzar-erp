import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { NotaCredito } from "../interfaces/credit-note.interface";
import { getNotaCredito } from "../services/actions";
import { creditNotePdfDescriptor } from "./creditNotePdf";

/**
 * Fuente del PDF de una nota de crédito (EC-859). El retrieve se lee FRESCO con
 * el servicio, sin pasar por `["credit-note-detail", id]` ni por el listado,
 * las cachés que observan sus diálogos (regla de `renderedDocumentPdfSource`).
 */
export const creditNotePdfSource = (options: {
  notaId: number;
  /** Arma el Blob; el botón pasa `generateCreditNotePdfBlob`, las pruebas uno falso. */
  render: (nota: NotaCredito, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getNotaCredito(options.notaId),
    describe: creditNotePdfDescriptor,
    render: (nota, { company }) => options.render(nota, company),
  });
