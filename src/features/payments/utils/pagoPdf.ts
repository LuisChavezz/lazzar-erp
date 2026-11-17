import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { Pago } from "../interfaces/payment.interface";

/**
 * Identidad de un pago a proveedor para su PDF (EC-859): código `PAG`. El pago
 * no tiene folio ni serie en el backend (se identifica por su id, "Pago 123"
 * en la póliza), así que el archivo es siempre `PAG-ID<id>.pdf` y el PDF
 * muestra `#id`. La marca sale solo con `Cancelado` y dice "CANCELADO".
 */
export const pagoPdfDescriptor = (pago: Pick<Pago, "id" | "estatus">): DocumentPdfDescriptor => ({
  type: "PAG",
  id: pago.id,
  folio: null,
  cancelled: pago.estatus === "Cancelado",
});
