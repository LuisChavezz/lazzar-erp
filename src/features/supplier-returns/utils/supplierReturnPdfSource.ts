import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderedDocumentPdfSource, type DocumentPdfSource } from "@/src/pdfs/shared/documentPdfSource";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";
import { getSupplierReturn } from "../services/actions";
import { supplierReturnPdfDescriptor } from "./supplierReturnPdf";

interface SupplierReturnPdfSourceOptions {
  returnId: number;
  /** Arma el Blob; el botón pasa `generateSupplierReturnPdfBlob`, las pruebas uno falso. */
  render: (detail: SupplierReturn, company: PdfCompany) => Promise<Blob>;
}

/**
 * Fuente del PDF de una devolución a proveedor (EC-976). El detalle se lee
 * FRESCO con el servicio (`getSupplierReturn`), sin pasar por la consulta del
 * diálogo: un fallo aquí no la cambia a error ni le dispara su aviso (regla de
 * `renderedDocumentPdfSource`). Módulo sin React para probarlo en `tests/unit/`.
 */
export const supplierReturnPdfSource = (options: SupplierReturnPdfSourceOptions): DocumentPdfSource =>
  renderedDocumentPdfSource({
    fetchDetail: () => getSupplierReturn(options.returnId),
    describe: supplierReturnPdfDescriptor,
    render: (detail, { company }) => options.render(detail, company),
  });
