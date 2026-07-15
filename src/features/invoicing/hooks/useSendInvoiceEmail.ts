"use client";

import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "@/src/features/google/services/actions";
import {
  createEmailAttachmentPromise,
  renderEmailContent,
  type SendEmailResult,
} from "@/src/features/google/utils/emailSend.utils";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { generateInvoicePdfBlob } from "../services/pdf/invoicePdfBlob";
import type { Invoice } from "../interfaces/invoice.interface";

// --- Hook ---

/**
 * Envía la factura por correo al CLIENTE con el PDF adjunto.
 *
 * Flujo — todo el acceso al backend externo ocurre client-side via v1_api,
 * garantizando que las cookies auth-jwt/auth-refresh-jwt del browser viajen
 * correctamente y el interceptor de refresh actúe ante un 401.
 *
 * 1. renderEmailContent() — API Route Next.js: valida sesión + permiso +
 *    destinatario + estatus enviable y renderiza HTML en Node.js. El
 *    destinatario (`correo_facturas`) ya viaja en la factura —resuelto
 *    server-side—, así que no hace falta un lookup adicional al catálogo de
 *    clientes. Su error tiene PRIORIDAD sobre un fallo de generación de
 *    PDF/adjunto no relacionado (ver comentario junto a `attachmentPromise`). ✓
 * 2. googleSendEmail()    — v1_api POST, cookies + interceptor de refresh ✓
 *
 * El PDF se genera con el MISMO generador que "Descargar PDF"
 * (generateInvoicePdfBlob) a partir del MISMO snapshot de la factura, por lo que
 * el adjunto es idéntico al documento descargable. La validación de tamaño
 * (25 MB sobre el payload base64 real) se delega en `buildGoogleEmailAttachment`.
 */
export const useSendInvoiceEmail = () => {
  return useMutation<SendEmailResult, unknown, Invoice>({
    mutationKey: ["invoices", "send-email"],
    mutationFn: async (invoice: Invoice): Promise<SendEmailResult> => {
      // Dispara el PDF/adjunto en paralelo con la validación de abajo, sin
      // esperarlo todavía — ver rationale en `createEmailAttachmentPromise`.
      const attachmentPromise = createEmailAttachmentPromise(
        () => generateInvoicePdfBlob(invoice),
        `factura-${invoice.folio || invoice.id}.pdf`,
        "application/pdf",
        "El PDF de la factura excede el límite de 25 MB permitido para adjuntos.",
      );

      // El destinatario ya viaja en la factura como `correo_facturas` (resuelto
      // server-side); se preserva su `null` tal cual —sin coaccionar a cadena
      // vacía— para que el Route Handler lo rechace de forma autoritativa.
      const correo = invoice.correo_facturas;

      // Valida (destinatario + estatus + sesión) y renderiza el HTML — su error
      // tiene prioridad sobre un fallo de generación de PDF/adjunto.
      const content = await renderEmailContent(`/api/invoices/${invoice.id}/send-email`, {
        invoice,
        correo,
      });

      // Para este punto el adjunto ya se generó (o está a punto de hacerlo) en
      // paralelo, así que este await normalmente no agrega espera adicional.
      const attachment = await attachmentPromise;

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
