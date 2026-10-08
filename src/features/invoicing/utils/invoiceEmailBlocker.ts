import { isInvoiceSendable } from "../constants/invoiceStatus";
import type { Invoice } from "../interfaces/invoice.interface";

export type InvoiceEmailBlockReason = "deleted" | "not-sendable" | "no-recipient";

export interface InvoiceEmailBlocker {
  reason: InvoiceEmailBlockReason;
  message: string;
}

/**
 * Por qué una factura NO puede enviarse por correo, o `null` si puede. Fuente
 * única de la regla para la página de detalle (`useInvoiceDocumentActions`) y
 * el menú del listado (`useInvoiceListDocumentActions`), siempre sobre el
 * retrieve. En orden:
 *
 * - `deleted`: factura eliminada (`activo === false`).
 * - `not-sendable`: estatus no enviable (Cancelada, o uno desconocido; ver
 *   `isInvoiceSendable`).
 * - `no-recipient`: sin correo de destino (`correo_facturas === null`).
 *
 * El Route Handler de envío revalida destinatario y estatus de forma
 * autoritativa.
 */
export function getInvoiceEmailBlocker(
  invoice: Pick<Invoice, "activo" | "estatus" | "correo_facturas">,
): InvoiceEmailBlocker | null {
  if (!invoice.activo) {
    return {
      reason: "deleted",
      message: "No se puede enviar por correo una factura eliminada.",
    };
  }
  if (!isInvoiceSendable(invoice.estatus)) {
    return {
      reason: "not-sendable",
      message: "No se puede enviar por correo una factura cancelada.",
    };
  }
  if (invoice.correo_facturas === null) {
    return {
      reason: "no-recipient",
      message: "Ni el pedido ni el cliente tienen correo de facturación.",
    };
  }
  return null;
}
