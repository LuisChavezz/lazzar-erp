/**
 * Genera un Blob PDF a partir de los datos de una orden de compra.
 *
 * El documento (y con él `@react-pdf/renderer`) se carga con `import()`
 * dinámico vía `renderPdfBlob`: importarlo aquí arriba metía la librería
 * entera en el bundle del listado de OC (que usa este generador desde el menú
 * de cada fila) aunque nadie descargara un PDF (EC-695).
 *
 * Es el MISMO generador que consume "Descargar PDF" y el adjunto del correo al
 * proveedor, por lo que el archivo enviado es idéntico al descargable.
 */
import type { PurchaseOrderDetail } from "../../interfaces/purchase-order.interface";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";

export const generatePurchaseOrderPdfBlob = (
  order: PurchaseOrderDetail,
): Promise<Blob> =>
  renderPdfBlob(
    () =>
      import("@/src/pdfs/PurchaseOrderPdfDocument").then(
        (m) => m.PurchaseOrderPdfDocument,
      ),
    { order },
  );
