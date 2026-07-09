/**
 * Genera un Blob PDF a partir de los datos de una orden de compra.
 * Utiliza dynamic import de @react-pdf/renderer para evitar problemas en SSR.
 *
 * Es el MISMO generador que consume "Descargar PDF" y el adjunto del correo al
 * proveedor, por lo que el archivo enviado es idéntico al descargable.
 */
import React from "react";
import type { PurchaseOrderDetail } from "../../interfaces/purchase-order.interface";
import { PurchaseOrderPdfDocument } from "@/src/pdfs/PurchaseOrderPdfDocument";

export const generatePurchaseOrderPdfBlob = async (
  order: PurchaseOrderDetail,
): Promise<Blob> => {
  const { pdf } = await import("@react-pdf/renderer");

  return pdf(<PurchaseOrderPdfDocument order={order} />).toBlob();
};
