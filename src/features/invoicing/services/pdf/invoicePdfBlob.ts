/**
 * Genera un Blob PDF a partir de los datos de una factura.
 *
 * El documento (y con él `@react-pdf/renderer`) se carga con `import()`
 * dinámico vía `renderPdfBlob`, para que la librería no entre en el chunk
 * inicial del listado ni del detalle de facturas (EC-700).
 *
 * Es el MISMO generador que consume "Descargar PDF" y el adjunto del correo al
 * cliente, por lo que el archivo enviado es idéntico al descargable.
 */
import type { Invoice } from "../../interfaces/invoice.interface";
import { renderPdfBlob } from "@/src/utils/renderPdfBlob";

export const generateInvoicePdfBlob = (invoice: Invoice): Promise<Blob> =>
  renderPdfBlob(
    () => import("@/src/pdfs/InvoicePdfDocument").then((m) => m.InvoicePdfDocument),
    { invoice },
  );
