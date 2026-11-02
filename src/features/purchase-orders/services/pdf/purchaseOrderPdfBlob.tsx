/**
 * Genera un Blob PDF a partir de los datos de una orden de compra.
 *
 * `@react-pdf/renderer` Y el documento se cargan con `import()` dinámico: el
 * documento importa los primitivos de react-pdf de forma estática, así que
 * importarlo aquí arriba metía la librería entera en el bundle del listado de
 * OC (que usa este generador desde el menú de cada fila) aunque nadie
 * descargara un PDF (EC-695). Así solo se descarga al generar uno.
 *
 * Es el MISMO generador que consume "Descargar PDF" y el adjunto del correo al
 * proveedor, por lo que el archivo enviado es idéntico al descargable.
 */
import type { PurchaseOrderDetail } from "../../interfaces/purchase-order.interface";

export const generatePurchaseOrderPdfBlob = async (
  order: PurchaseOrderDetail,
): Promise<Blob> => {
  const [{ pdf }, { PurchaseOrderPdfDocument }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/src/pdfs/PurchaseOrderPdfDocument"),
  ]);

  return pdf(<PurchaseOrderPdfDocument order={order} />).toBlob();
};
