"use client";

import { useRef, useState } from "react";
import { useMutation, useMutationState, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "@/src/features/google/services/actions";
import { buildGoogleEmailAttachment } from "@/src/features/google/utils/googleEmailAttachment.utils";
import { renderEmailContent, type SendEmailResult } from "@/src/features/google/utils/emailSend.utils";
import type { GoogleEmailPayload } from "@/src/features/google/interfaces/google.interface";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import { isPurchaseOrderAuthorizedOrComplete } from "../constants/purchaseOrderStatus";
import { generatePurchaseOrderPdfBlob } from "../services/pdf/purchaseOrderPdfBlob";
import { canSeeAmounts } from "../utils/purchaseOrderFinance";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
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

/**
 * Correo de una orden de compra LISTO para confirmarse: lo que se va a enviar,
 * tal como se enviará. Se arma ANTES de pedir confirmación para que el diálogo
 * (`PurchaseOrderSendEmailConfirmDialog`) muestre destinatario, asunto y
 * adjunto reales, y el envío usa exactamente este contenido. Mismo flujo que
 * el de facturas (`usePrepareInvoiceEmail` / `useSendInvoiceEmail`).
 */
export interface PreparedPurchaseOrderEmail {
  /** Id de la orden: también lo lee `selectMutationRecordId` (en curso por fila). */
  id: number;
  /** Folio a mostrar en el título del diálogo (`#id` si aún no tiene). */
  label: string;
  /** Foto de la orden con la que se renderizó el correo y se genera el PDF. */
  order: PurchaseOrderDetail;
  /** Correo renderizado por el Route Handler; `to` es el correo del proveedor. */
  content: GoogleEmailPayload;
  attachmentName: string;
}

export const preparePurchaseOrderEmailMutationKey = ["purchase-orders", "prepare-email"] as const;
export const sendPurchaseOrderEmailMutationKey = ["purchase-orders", "send-email"] as const;

/**
 * Paso 1: obtiene la orden y renderiza el correo al PROVEEDOR, SIN enviarlo.
 * Todo el acceso al backend externo ocurre client-side via v1_api (cookies
 * auth-jwt/auth-refresh-jwt + interceptor de refresh).
 *
 * 1. getPurchaseOrder()   — v1_api GET siempre fresco (ver la guarda de
 *    estatus), con la llave de `usePurchaseOrder`.
 * 2. renderEmailContent() — API Route Next.js: valida `proveedor_correo` +
 *    sesión y renderiza el HTML en Node.js. El `to` que devuelve es el correo
 *    del proveedor, y es lo que muestra el diálogo.
 */
export const usePreparePurchaseOrderEmail = () => {
  const queryClient = useQueryClient();

  return useMutation<PreparedPurchaseOrderEmail, unknown, number>({
    mutationKey: preparePurchaseOrderEmailMutationKey,
    mutationFn: async (orderId: number): Promise<PreparedPurchaseOrderEmail> => {
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
      // corta aquí —el Route Handler no puede consultar al backend— y se
      // refresca el listado para que la fila muestre su estatus real.
      if (!isPurchaseOrderAuthorizedOrComplete(order.estatus)) {
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        throw new Error(ESTATUS_CAMBIO_MSG);
      }

      // El detalle ya viene filtrado por rol: si faltan los importes, no se
      // envía una orden sin precios al proveedor. Se corta ANTES de llamar al
      // render, para no gastar ese trabajo en vano.
      if (!canSeeAmounts(order)) {
        throw new Error(SIN_IMPORTES_MSG);
      }

      const content = await renderEmailContent(`/api/purchase-orders/${order.id}/send-email`, {
        order,
      });

      return {
        id: order.id,
        label: order.folio || `#${order.id}`,
        order,
        content,
        attachmentName: `orden-compra-${order.folio || order.id}.pdf`,
      };
    },
    onError: (error) => {
      toast.error(
        extractErrorMessage(error, "No se pudo preparar el correo de la orden de compra."),
      );
    },
  });
};

/**
 * Paso 2, solo tras confirmar: genera el PDF y envía el correo preparado
 * (v1_api POST, cookies + interceptor de refresh).
 *
 * El PDF se genera con el MISMO generador que "Descargar PDF"
 * (generatePurchaseOrderPdfBlob) a partir de la MISMA foto con la que se
 * renderizó el correo, por lo que el adjunto es idéntico al documento
 * descargable. La validación de tamaño (25 MB sobre el payload base64 real) se
 * delega en `buildGoogleEmailAttachment`.
 */
export const useSendPurchaseOrderEmail = () =>
  useMutation<SendEmailResult, unknown, PreparedPurchaseOrderEmail>({
    mutationKey: sendPurchaseOrderEmailMutationKey,
    mutationFn: async ({ order, content, attachmentName }): Promise<SendEmailResult> => {
      const pdfBlob = await generatePurchaseOrderPdfBlob(order);
      const attachment = await buildGoogleEmailAttachment(
        pdfBlob,
        attachmentName,
        "application/pdf",
        "El PDF de la orden excede el límite de 25 MB permitido para adjuntos.",
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
      toast.error(extractErrorMessage(error, "No se pudo enviar el correo de la orden de compra."));
    },
  });

/**
 * "Enviar correo" del listado con confirmación, para `PurchaseOrderView`: la
 * confirmación vive en la vista y no en la celda, que se desmonta al ordenar o
 * paginar. `onSendEmail` PREPARA el correo (orden fresca + render) y deja el
 * resultado en `emailConfirmation`, que la vista pinta con
 * `PurchaseOrderSendEmailConfirmDialog`; nada se envía hasta confirmar. Mismo
 * flujo que facturas (`useInvoiceListDocumentActions`) y cotizaciones.
 */
export function usePurchaseOrderEmailConfirmation() {
  const { mutateAsync: prepareEmail } = usePreparePurchaseOrderEmail();
  const { mutate: sendEmail } = useSendPurchaseOrderEmail();
  const [preparedEmail, setPreparedEmail] = useState<PreparedPurchaseOrderEmail | null>(null);
  // Turno del ÚLTIMO "Enviar correo" pedido: si mientras se prepara uno el
  // usuario pide el de otra fila, el primero ya no abre su confirmación encima.
  const emailTurnRef = useRef(0);

  const onSendEmail = async (orderId: number) => {
    const turn = ++emailTurnRef.current;
    try {
      const email = await prepareEmail(orderId);
      if (turn === emailTurnRef.current) setPreparedEmail(email);
    } catch {
      // El toast lo muestra la mutación.
    }
  };

  return {
    onSendEmail,
    /** Correo preparado esperando confirmación, o `null` si no hay ninguno. */
    emailConfirmation: preparedEmail && {
      email: preparedEmail,
      onClose: () => setPreparedEmail(null),
      onConfirm: () => sendEmail(preparedEmail),
    },
  };
}

/**
 * ¿Hay un correo de ESTA orden preparándose o enviándose? Se lee de la
 * `MutationCache` (no de una instancia de `useMutation`) para que el menú de la
 * fila lo vea aunque las mutaciones vivan en la vista (`PurchaseOrderView`) y
 * la celda se haya remontado al ordenar o paginar.
 */
export function usePurchaseOrderEmailStatus(orderId: number) {
  const preparing = useMutationState({
    filters: { mutationKey: [...preparePurchaseOrderEmailMutationKey], status: "pending" },
    select: selectMutationRecordId,
  });
  const sending = useMutationState({
    filters: { mutationKey: [...sendPurchaseOrderEmailMutationKey], status: "pending" },
    select: selectMutationRecordId,
  });

  return {
    isPreparingEmail: preparing.includes(orderId),
    isSendingEmail: sending.includes(orderId),
  };
}
