import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { ProductionOrderOnboarding } from "../interfaces/production-order.interface";
import { getProductionOrderOnboarding } from "../services/actions";
import { productionOrderPdfDescriptor } from "./productionOrderPdf";

/**
 * Fuente del PDF de una OP (EC-857).
 *
 * El detalle se lee FRESCO con el servicio (`onboarding/?op_id=`, el mismo
 * endpoint de la página), sin pasar por la caché
 * `["production-order-onboarding", id]` que observa la página: un fallo aquí
 * no debe cambiarla a su estado de error; lo avisa solo "Descargar PDF" (regla
 * de `renderedDocumentPdfSource`). Módulo sin React para probarlo.
 */
export const productionOrderPdfSource = (options: {
  opId: number;
  /** Arma el Blob; el botón pasa `generateProductionOrderPdfBlob`, las pruebas uno falso. */
  render: (op: ProductionOrderOnboarding, company: PdfCompany) => Promise<Blob>;
}): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getProductionOrderOnboarding(options.opId),
    describe: productionOrderPdfDescriptor,
    render: (op, { company }) => options.render(op, company),
  });
