/**
 * Genera un Blob PDF a partir de los datos de una orden de compra.
 *
 * El documento (y con él `@react-pdf/renderer`) se carga con `import()`
 * dinámico vía `renderPdfBlob`: importarlo aquí arriba metía la librería
 * entera en el bundle de las pantallas que ofrecen el PDF aunque nadie lo
 * descargara (EC-695).
 *
 * Es el MISMO generador que consume "Descargar PDF" (`purchaseOrderPdfSource`)
 * y el adjunto del correo al proveedor, por lo que el archivo enviado es
 * idéntico al descargable. `company` es la empresa activa del encabezado.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import type { PurchaseOrderDetail } from "../../interfaces/purchase-order.interface";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";

export const generatePurchaseOrderPdfBlob = (
  order: PurchaseOrderDetail,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () =>
      import("@/src/pdfs/PurchaseOrderPdfDocument").then(
        (m) => m.PurchaseOrderPdfDocument,
      ),
    { order, company },
  );
