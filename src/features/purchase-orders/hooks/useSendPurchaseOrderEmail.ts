"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "@/src/features/google/services/actions";
import {
  createEmailAttachmentPromise,
  renderEmailContent,
  type SendEmailResult,
} from "@/src/features/google/utils/emailSend.utils";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { generatePurchaseOrderPdfBlob } from "../services/pdf/purchaseOrderPdfBlob";
import { purchaseOrderQueryOptions } from "./usePurchaseOrder";

// --- Hook ---

/**
 * Envía la orden de compra por correo al PROVEEDOR con el PDF adjunto.
 *
 * Flujo de tres pasos — todo el acceso al backend externo ocurre client-side
 * via v1_api, garantizando que las cookies auth-jwt/auth-refresh-jwt del browser
 * viajen correctamente y el interceptor de refresh actúe ante un 401.
 *
 * 1. getPurchaseOrder()   — v1_api GET (vía el cache de `usePurchaseOrder`,
 *    reutilizado si ya está cacheado), cookies + interceptor de refresh ✓
 * 2. renderEmailContent() — API Route Next.js: valida `proveedor_correo` + sesión
 *    y renderiza HTML en Node.js. Su error tiene PRIORIDAD sobre un fallo de
 *    generación de PDF/adjunto no relacionado (ver comentario junto a
 *    `attachmentPromise`). ✓
 * 3. googleSendEmail()    — v1_api POST, cookies + interceptor de refresh ✓
 *
 * El PDF se genera con el MISMO generador que "Descargar PDF"
 * (generatePurchaseOrderPdfBlob) a partir del MISMO snapshot de la orden, por lo
 * que el adjunto es idéntico al documento descargable. La validación de tamaño
 * (25 MB sobre el payload base64 real) se delega en `buildGoogleEmailAttachment`.
 */
export const useSendPurchaseOrderEmail = () => {
  const queryClient = useQueryClient();

  return useMutation<SendEmailResult, unknown, number>({
    mutationKey: ["purchase-orders", "send-email"],
    mutationFn: async (orderId: number): Promise<SendEmailResult> => {
      // Reutiliza el cache de `usePurchaseOrder` (p. ej. si el usuario ya
      // abrió el diálogo de detalle) en vez de re-consultar siempre.
      const order = await queryClient.fetchQuery(purchaseOrderQueryOptions(orderId));

      // Dispara el PDF/adjunto en paralelo con la validación de abajo, sin
      // esperarlo todavía — ver rationale en `createEmailAttachmentPromise`.
      const attachmentPromise = createEmailAttachmentPromise(
        () => generatePurchaseOrderPdfBlob(order),
        `orden-compra-${order.folio || orderId}.pdf`,
        "application/pdf",
        "El PDF de la orden excede el límite de 25 MB permitido para adjuntos.",
      );

      // Valida (proveedor_correo + sesión) y renderiza el HTML — su error tiene
      // prioridad sobre un fallo de generación de PDF/adjunto.
      const content = await renderEmailContent(`/api/purchase-orders/${order.id}/send-email`, {
        order,
      });

      // Para este punto el adjunto ya se generó (o está a punto de hacerlo)
      // en paralelo con la llamada anterior, así que este await normalmente
      // no agrega espera adicional.
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
      toast.error(extractErrorMessage(error, "No se pudo enviar el correo de la orden de compra."));
    },
  });
};
