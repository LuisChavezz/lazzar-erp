import type { DocumentPdfDescriptor } from "@/src/pdfs/shared/documentPdfModel";
import type { FacturaProveedor } from "../interfaces/supplier-invoice.interface";

/**
 * Identidad de una factura de proveedor para su PDF (EC-859): código `FP`. El
 * folio es el del proveedor, capturado a mano (sin serie): `FP-A-123.pdf`, o
 * `FP-ID<id>.pdf` si no se capturó. La marca sale solo con `Cancelada`.
 */
export const supplierInvoicePdfDescriptor = (
  factura: Pick<FacturaProveedor, "id" | "folio" | "estatus">,
): DocumentPdfDescriptor => {
  const cancelled = factura.estatus === "Cancelada";
  return {
    type: "FP",
    id: factura.id,
    folio: factura.folio,
    cancelled,
    ...(cancelled ? { cancelledLabel: "CANCELADA" } : {}),
  };
};

