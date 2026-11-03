"use client";

import { useSendEmailConfirmation } from "@/src/features/google/hooks/useSendEmailConfirmation";
import type { Invoice } from "../interfaces/invoice.interface";
import { getInvoiceEmailBlocker } from "../utils/invoiceEmailBlocker";
import { useDownloadInvoicePdf } from "./useDownloadInvoicePdf";
import {
  prepareInvoiceEmailMutationKey,
  sendInvoiceEmailMutationKey,
  usePrepareInvoiceEmail,
  useSendInvoiceEmail,
  type PreparedInvoiceEmail,
} from "./useSendInvoiceEmail";

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
 * - Enviar correo primero PREPARA el correo (valida y renderiza) y pide
 *   confirmación mostrando destinatario, asunto y adjunto
 *   (`InvoiceSendEmailConfirmDialog`, vía `useSendEmailConfirmation`); nada se
 *   envía hasta confirmar. Si la página pasa a otra factura mientras se
 *   prepara, la confirmación de la anterior se descarta (`expectedId`).
 */
export function useInvoiceDocumentActions(invoice: Invoice) {
  const { mutateAsync: prepareEmail, isPending: isPreparingEmail } = usePrepareInvoiceEmail();
  const { mutate: sendEmail, isPending: isSendingEmail } = useSendInvoiceEmail();
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadInvoicePdf();
  const email = useSendEmailConfirmation<PreparedInvoiceEmail>({
    busyMutationKeys: [prepareInvoiceEmailMutationKey, sendInvoiceEmailMutationKey],
    // `request` siempre se pide con el id de `invoice` (ver `sendEmail` abajo).
    prepare: () => prepareEmail(invoice),
    send: sendEmail,
    expectedId: invoice.id,
  });
  const busy = isPreparingEmail || isSendingEmail || isDownloadingPdf;
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
    isPreparingEmail,
    isSendingEmail,
    isDownloadingPdf,
    sendEmail: () => email.request(invoice.id),
    downloadPdf: () => downloadPdf(invoice),
    /** Sesión del diálogo de confirmación del correo (`useSendEmailConfirmation`). */
    emailDialog: email.dialog,
  };
}
