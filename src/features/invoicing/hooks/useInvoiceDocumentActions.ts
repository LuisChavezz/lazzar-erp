"use client";

import type { Invoice } from "../interfaces/invoice.interface";
import { getInvoiceEmailBlocker } from "../utils/invoiceEmailBlocker";
import { useDownloadInvoicePdf } from "./useDownloadInvoicePdf";
import { useSendInvoiceEmail } from "./useSendInvoiceEmail";

/**
 * Reglas de las acciones "Enviar correo" y "Descargar PDF" de UNA factura, en
 * un solo lugar, para la cabecera de la página de detalle, con el `Invoice`
 * del retrieve que alimenta el PDF y el correo. El menú del listado aplica las
 * mismas reglas pidiendo el retrieve al activarse
 * (`useInvoiceListDocumentActions`).
 *
 * - Enviar correo solo existe en un estatus enviable (no Cancelada) y en una
 *   factura ACTIVA: no debe salir hacia el cliente un comprobante cancelado o
 *   eliminado como si estuviera vigente.
 *   Cuando no se cumple, la acción se OCULTA (no se muestra deshabilitada).
 *   Se deshabilita sin correo de destino (`correo_facturas === null`, resuelto
 *   server-side: pedido → cliente → null) o con un envío o descarga en curso.
 *   El Route Handler valida destinatario y estatus de forma autoritativa.
 * - Descargar PDF NO depende del estatus: consultar o archivar internamente una
 *   factura cancelada no corre ese riesgo (su PDF se rotula con su estatus; el
 *   del Borrador no lleva estatus, por decisión de negocio). Si también se
 *   ocultara, no quedaría forma de obtener el documento de una cancelada. No
 *   necesita correo. Sigue disponible en una factura eliminada (uso interno).
 *   Se deshabilita con una descarga o un envío en curso.
 */
export function useInvoiceDocumentActions(invoice: Invoice) {
  const { mutate: sendEmail, isPending: isSendingEmail } = useSendInvoiceEmail();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadInvoicePdf();
  const busy = isSendingEmail || isDownloadingPdf;
  // Regla compartida con el menú del listado (`getInvoiceEmailBlocker`):
  // eliminada o no enviable → se oculta; sin destinatario → se deshabilita.
  const emailBlocker = getInvoiceEmailBlocker(invoice);
  const hasNoRecipientEmail = emailBlocker?.reason === "no-recipient";

  return {
    canSendEmail: emailBlocker === null || hasNoRecipientEmail,
    hasNoRecipientEmail,
    /** Motivo a mostrar en el botón deshabilitado por falta de destinatario. */
    noRecipientMessage: hasNoRecipientEmail ? emailBlocker.message : undefined,
    emailDisabled: busy || hasNoRecipientEmail,
    pdfDisabled: busy,
    isSendingEmail,
    isDownloadingPdf,
    sendEmail: () => sendEmail(invoice),
    downloadPdf: () => downloadPdf(invoice),
  };
}
