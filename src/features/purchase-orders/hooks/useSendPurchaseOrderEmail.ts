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
import { isPurchaseOrderAuthorizedOrComplete } from "../constants/purchaseOrderStatus";
import { generatePurchaseOrderPdfBlob } from "../services/pdf/purchaseOrderPdfBlob";
import { canSeeAmounts } from "../utils/purchaseOrderFinance";
import { purchaseOrderQueryOptions } from "./usePurchaseOrder";

/**
 * Mensaje cuando el rol del usuario no puede ver los importes de la orden.
 * El correo lleva la orden (y su PDF) al proveedor: sin precios sería un
 * documento roto, así que se bloquea aquí —con el detalle YA filtrado por el
 * backend— en vez de en el listado, cuya fila no está filtrada.
 */
const SIN_IMPORTES_MSG =
  "No tienes acceso a los importes de esta orden, así que no puede enviarse al proveedor.";

/** Mensaje cuando el estatus real de la orden ya no es 3, 4 o 5 (ver la guarda). */
const ESTATUS_CAMBIO_MSG =
  "El estatus de esta orden cambió y ya no puede enviarse por correo. Se actualizó el listado.";

// --- Hook ---

/**
 * Envía la orden de compra por correo al PROVEEDOR con el PDF adjunto.
 *
 * Flujo de tres pasos — todo el acceso al backend externo ocurre client-side
 * via v1_api, garantizando que las cookies auth-jwt/auth-refresh-jwt del browser
 * viajen correctamente y el interceptor de refresh actúe ante un 401.
 *
 * 1. getPurchaseOrder()   — v1_api GET (siempre fresco, con la llave de
 *    `usePurchaseOrder`; ver la guarda de estatus), cookies + interceptor de
 *    refresh ✓
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
      // A diferencia de "Descargar PDF", aquí NO se reutiliza el cache del
      // detalle (`staleTime: 0` fuerza el GET): la guarda de estatus de abajo
      // tiene que ver el estatus REAL, no uno cacheado hasta 15 min.
      const order = await queryClient.fetchQuery({
        ...purchaseOrderQueryOptions(orderId),
        staleTime: 0,
      });

      // La fila del listado que habilitó "Enviar correo" puede estar
      // desactualizada: si otro usuario canceló o editó la orden (regresa a
      // pendiente), le llegaría al proveedor una orden que ya no está en firme
      // —y, si está cancelada, con la leyenda "CANCELADA" en el adjunto—. Se
      // corta aquí —el Route Handler no puede
      // consultar al backend— y se refresca el listado para que la fila
      // muestre su estatus real.
      if (!isPurchaseOrderAuthorizedOrComplete(order.estatus)) {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        throw new Error(ESTATUS_CAMBIO_MSG);
      }

      // El detalle ya viene filtrado por rol: si faltan los importes, no se
      // envía una orden sin precios al proveedor. Se corta ANTES de generar el
      // PDF o llamar al render, para no gastar ese trabajo en vano.
      if (!canSeeAmounts(order)) {
        throw new Error(SIN_IMPORTES_MSG);
      }

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
