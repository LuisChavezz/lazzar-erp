/**
 * Genera el Blob PDF de un pedido (EC-856).
 *
 * El documento (y con él `@react-pdf/renderer`) se carga con `import()`
 * dinámico vía `renderPdfBlob`, igual que el de la orden de compra: así la
 * librería solo se descarga al generar el PDF (EC-695). `company` es la
 * empresa activa del encabezado.
 */
import type { PdfCompany } from "@/src/pdfs/shared/documentPdfModel";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";
import type { PedidoPdfData } from "../../utils/loadPedidoForPdf";

export const generatePedidoPdfBlob = (
  { pedido, currency }: PedidoPdfData,
  company: PdfCompany | null,
): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/PedidoPdfDocument").then((m) => m.PedidoPdfDocument),
    { pedido, company, currency },
  );
