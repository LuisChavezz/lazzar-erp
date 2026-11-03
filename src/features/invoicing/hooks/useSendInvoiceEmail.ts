"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "@/src/features/google/services/actions";
import { buildGoogleEmailAttachment } from "@/src/features/google/utils/googleEmailAttachment.utils";
import { renderEmailContent, type SendEmailResult } from "@/src/features/google/utils/emailSend.utils";
import type { GoogleEmailPayload } from "@/src/features/google/interfaces/google.interface";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { assertEmailSnapshotUnchanged } from "@/src/features/google/utils/sendEmailFlow";
import { generateInvoicePdfBlob } from "../services/pdf/invoicePdfBlob";
import { getInvoiceEmailBlocker } from "../utils/invoiceEmailBlocker";
import { invoiceEmailRenderInputs } from "../utils/invoiceEmailRenderInputs";
import type { Invoice } from "../interfaces/invoice.interface";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";

export const INVOICE_EMAIL_STALE_MESSAGE =
  "La factura cambió desde que preparaste el correo, así que no se envió. Vuelve a intentarlo para revisar la versión actual.";

/**
 * Correo de una factura LISTO para confirmarse: lo que se va a enviar, tal como
 * se enviará. Se arma ANTES de pedir confirmación para que el diálogo
 * (`InvoiceSendEmailConfirmDialog`) muestre destinatario, asunto y adjunto
 * reales, y el envío usa exactamente este contenido. Mismo flujo que el de
 * cotizaciones (`usePrepareQuoteEmail` / `useGoogleSendEmail`).
 */
export interface PreparedInvoiceEmail {
  id: number;
  /** Folio a mostrar en el título del diálogo (`#id` si viene vacío). */
  label: string;
  /** Foto de la factura con la que se renderizó el correo y se genera el PDF. */
  invoice: Invoice;
  /** Correo renderizado por el Route Handler; `to` es el destinatario validado. */
  content: GoogleEmailPayload;
  attachmentName: string;
}

/**
 * Lee la factura FRESCA (misma llave que el detalle: si cambió, el detalle
 * también se actualiza) y aplica `getInvoiceEmailBlocker`. La usan preparar
 * desde el detalle y enviar.
 */
const fetchSendableInvoice = async (queryClient: QueryClient, id: number): Promise<Invoice> => {
  const invoice = await queryClient.fetchQuery(invoiceRetrieveFreshOptions(id));
  const blocker = getInvoiceEmailBlocker(invoice);
  if (blocker) throw new Error(blocker.message);
  return invoice;
};

export const prepareInvoiceEmailMutationKey = ["invoices", "prepare-email"] as const;
export const sendInvoiceEmailMutationKey = ["invoices", "send-email"] as const;

/**
 * Paso 1: valida y renderiza el correo de la factura, SIN enviarlo.
 *
 * Recibe la factura ya leída fresca (el listado la lee con su propio aviso de
 * error) o su id (el detalle): con el id la lee fresca aquí y le aplica
 * `getInvoiceEmailBlocker`, para no preparar desde la lectura que se cargó al
 * abrir la página.
 *
 * renderEmailContent() — API Route Next.js: valida sesión + permiso +
 * destinatario + estatus enviable y renderiza el HTML en Node.js. El
 * destinatario (`correo_facturas`) ya viaja en la factura —resuelto
 * server-side—; se preserva su `null` tal cual —sin coaccionar a cadena
 * vacía— para que el Route Handler lo rechace de forma autoritativa. El `to`
 * que devuelve es el destinatario ya validado, y es lo que muestra el diálogo.
 */
export const usePrepareInvoiceEmail = () => {
  const queryClient = useQueryClient();

  return useMutation<PreparedInvoiceEmail, unknown, Invoice | number>({
    mutationKey: prepareInvoiceEmailMutationKey,
    mutationFn: async (target): Promise<PreparedInvoiceEmail> => {
      const invoice = typeof target === "number" ? await fetchSendableInvoice(queryClient, target) : target;
      const content = await renderEmailContent(`/api/invoices/${invoice.id}/send-email`, {
        invoice,
        correo: invoice.correo_facturas,
      });
      const label = invoice.folio || `#${invoice.id}`;
      return {
        id: invoice.id,
        label,
        invoice,
        content,
        attachmentName: `factura-${invoice.folio || invoice.id}.pdf`,
      };
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo preparar el correo de la factura."));
    },
  });
};

/**
 * Paso 2, solo tras confirmar: vuelve a leer la factura (retrieve fresco), la
 * revalida con `getInvoiceEmailBlocker` y, si sigue IGUAL a la foto que se
 * preparó, genera el PDF y envía el correo al CLIENTE (v1_api POST, cookies +
 * interceptor de refresh).
 *
 * Entre preparar y confirmar la confirmación puede quedar abierta: si otro
 * usuario canceló, eliminó o modificó la factura, se aborta sin enviar —nunca
 * sale una versión distinta de la que el usuario confirmó—. Se compara lo que
 * se RENDERIZA (`invoiceEmailRenderInputs`: el modelo del documento y
 * `correo_facturas`, el destinatario): un cambio que no se ve (pagos, CFDI,
 * auditoría) no aborta.
 *
 * El PDF se genera con el MISMO generador que "Descargar PDF"
 * (generateInvoicePdfBlob) a partir de la MISMA foto con la que se renderizó el
 * correo, por lo que el adjunto es idéntico al documento descargable. La
 * validación de tamaño (25 MB sobre el payload base64 real) se delega en
 * `buildGoogleEmailAttachment`.
 */
export const useSendInvoiceEmail = () => {
  const queryClient = useQueryClient();

  return useMutation<SendEmailResult, unknown, PreparedInvoiceEmail>({
    mutationKey: sendInvoiceEmailMutationKey,
    mutationFn: async ({ id, invoice, content, attachmentName }): Promise<SendEmailResult> => {
      const current = await fetchSendableInvoice(queryClient, id);
      assertEmailSnapshotUnchanged(
        invoiceEmailRenderInputs(current),
        invoiceEmailRenderInputs(invoice),
        INVOICE_EMAIL_STALE_MESSAGE,
      );

      const pdfBlob = await generateInvoicePdfBlob(invoice);
      const attachment = await buildGoogleEmailAttachment(
        pdfBlob,
        attachmentName,
        "application/pdf",
        "El PDF de la factura excede el límite de 25 MB permitido para adjuntos.",
      );

      await googleSendEmail({
        ...content,
        attachments: [attachment],
      });

      return { recipient: content.to, subject: content.subject };
    },
    onSuccess: ({ recipient }) => {
      toast.success(`Correo enviado a ${recipient.toLocaleLowerCase()}`);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, "No se pudo enviar el correo de la factura."));
    },
  });
};
