/**
 * Genera el Blob PDF de una factura de proveedor (EC-859), con el documento y
 * `@react-pdf/renderer` en carga diferida (`renderPdfBlob`). `company` es la
 * empresa activa.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { FacturaProveedor } from "../../interfaces/supplier-invoice.interface";

export const generateSupplierInvoicePdfBlob = (factura: FacturaProveedor, company: PdfCompany | null): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/SupplierInvoicePdfDocument").then((m) => m.SupplierInvoicePdfDocument),
    { factura, company },
  );
