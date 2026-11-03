import type { Invoice } from "../interfaces/invoice.interface";
import { buildInvoiceDocumentModel } from "./invoiceDocumentModel";

/**
 * Lo que se RENDERIZA del correo de una factura y de su PDF adjunto, para que
 * el envío compare la versión confirmada con la recién leída
 * (`assertEmailSnapshotUnchanged`) sin abortar por cambios que no se ven:
 * pagos, CFDI, auditoría…
 *
 * - `document`: `InvoicePdfDocument` solo lee este modelo, y `InvoiceEmail` y
 *   su asunto (`buildInvoiceEmailSubject`) se construyen del mismo.
 * - `correo`: el destinatario (`to` del Route Handler) y el pie del correo.
 */
export const invoiceEmailRenderInputs = (invoice: Invoice) => ({
  document: buildInvoiceDocumentModel(invoice),
  correo: invoice.correo_facturas,
});
