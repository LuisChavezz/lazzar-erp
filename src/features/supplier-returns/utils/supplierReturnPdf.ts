import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import { cancellationPdfFields } from "@/src/features/document-cancellation/utils/cancellationPdf";
import type { SupplierReturn } from "../interfaces/supplier-return.interface";

/**
 * Identidad de una devolución a proveedor para su PDF (EC-976): código `DVP`.
 * El folio de respaldo (`DVP-<fecha y hora>`) ya lleva el segmento, así que el
 * archivo no lo repite; un folio de la serie de la sucursal con otro prefijo
 * sale `DVP-<folio>.pdf`.
 *
 * Cancelada: marca de la base con el motivo y quién y cuándo canceló, del
 * detalle fresco que lee la fuente.
 */
export const supplierReturnPdfDescriptor = (
  dev: Pick<
    SupplierReturn,
    "id" | "folio" | "estatus" | "motivo_cancelacion" | "fecha_cancelacion" | "cancelado_por_nombre"
  >,
): DocumentPdfDescriptor => {
  const cancelled = dev.estatus === "cancelada";
  return {
    type: "DVP",
    id: dev.id,
    folio: dev.folio,
    cancelled,
    ...cancellationPdfFields(cancelled, dev),
  };
};
