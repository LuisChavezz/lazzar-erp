"use client";

import { useMutationState } from "@tanstack/react-query";
import { useSendEmailConfirmation } from "@/src/features/google/hooks/useSendEmailConfirmation";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
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
 *   confirmación mostrando destinatario, asunto y adjunto; nada se envía hasta
 *   confirmar. Esa confirmación la monta la PÁGINA (`useInvoiceDetailEmail` en
 *   `InvoiceDetailPageContent`), no esta cabecera: cambiar de hoja la
 *   desmontaría a media preparación. Aquí llega `onSendEmail`, y el "en curso"
 *   se lee de la `MutationCache` para esta factura.
 */
export function useInvoiceDocumentActions(invoice: Invoice, onSendEmail: (invoiceId: number) => void) {
  const preparingIds = useMutationState({
    filters: { mutationKey: [...prepareInvoiceEmailMutationKey], status: "pending" },
    select: selectMutationRecordId,
  });
  const sendingIds = useMutationState({
    filters: { mutationKey: [...sendInvoiceEmailMutationKey], status: "pending" },
    select: selectMutationRecordId,
  });
  const isPreparingEmail = preparingIds.includes(invoice.id);
  const isSendingEmail = sendingIds.includes(invoice.id);
  const { mutate: downloadPdf, isPending: isDownloadingPdf } = useDownloadInvoicePdf();
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
    sendEmail: () => onSendEmail(invoice.id),
    downloadPdf: () => downloadPdf(invoice),
  };
}

/**
 * "Enviar correo" de la página de detalle con confirmación
 * (`useSendEmailConfirmation`). Lo monta `InvoiceDetailPageContent` —no la
 * cabecera de la hoja— para que la preparación y la confirmación sobrevivan a
 * cambiar de hoja. Prepara desde el retrieve FRESCO (por id), no desde la
 * lectura con la que se abrió la página. Si la página pasa a otra factura
 * mientras se prepara, la confirmación de la anterior se descarta
 * (`expectedId`).
 */
export function useInvoiceDetailEmail(invoiceId: number) {
  const { mutateAsync: prepareEmail } = usePrepareInvoiceEmail();
  const { mutate: sendEmail } = useSendInvoiceEmail();

  return useSendEmailConfirmation<PreparedInvoiceEmail>({
    busyMutationKeys: [prepareInvoiceEmailMutationKey, sendInvoiceEmailMutationKey],
    prepare: prepareEmail,
    send: sendEmail,
    expectedId: invoiceId,
  });
}
