"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "@/src/features/google/services/actions";
import { buildGoogleEmailAttachment } from "@/src/features/google/utils/googleEmailAttachment.utils";
import type { GoogleEmailPayload } from "@/src/features/google/interfaces/google.interface";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { generatePurchaseOrderPdfBlob } from "../services/pdf/purchaseOrderPdfBlob";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
import { purchaseOrderQueryOptions } from "./usePurchaseOrder";

// --- Tipos internos ---

type RenderedEmailPayload = GoogleEmailPayload & { error?: string };

type SendResult = { recipient: string; subject: string };

/**
 * Paso 2: envía la orden al API Route para renderizarla con react-email en
 * Node.js. El API Route no hace llamadas al backend externo — solo valida el
 * correo del proveedor y renderiza HTML.
 */
const renderEmailContent = async (order: PurchaseOrderDetail): Promise<GoogleEmailPayload> => {
  const res = await fetch(`/api/purchase-orders/${order.id}/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });

  const data = (await res.json().catch(() => null)) as RenderedEmailPayload | null;

  if (!res.ok || !data) {
    throw new Error(data?.error || "No se pudo renderizar el correo.");
  }

  return data;
};

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

  return useMutation<SendResult, unknown, number>({
    mutationKey: ["purchase-orders", "send-email"],
    mutationFn: async (orderId: number): Promise<SendResult> => {
      // Reutiliza el cache de `usePurchaseOrder` (p. ej. si el usuario ya
      // abrió el diálogo de detalle) en vez de re-consultar siempre.
      const order = await queryClient.fetchQuery(purchaseOrderQueryOptions(orderId));

      // El PDF (y, a partir de él, el adjunto en base64 con su validación de
      // tamaño) se dispara en paralelo con la validación de abajo — ambos
      // solo dependen de `order` — pero SIN esperarlo todavía: si
      // `renderEmailContent` falla (proveedor_correo/sesión), ese error debe
      // ganar y mostrarse primero, no uno de generación de PDF/adjunto no
      // relacionado. El catch no-op evita un "unhandled rejection" si esto
      // falla antes de llegar al await de `attachmentPromise` más abajo — no
      // altera el valor con el que resuelve.
      const attachmentPromise = generatePurchaseOrderPdfBlob(order).then((blob) =>
        buildGoogleEmailAttachment(
          blob,
          `orden-compra-${order.folio || orderId}.pdf`,
          "application/pdf",
          "El PDF de la orden excede el límite de 25 MB permitido para adjuntos.",
        ),
      );
      attachmentPromise.catch(() => {});

      // Valida (proveedor_correo + sesión) y renderiza el HTML — su error tiene
      // prioridad sobre un fallo de generación de PDF/adjunto.
      const content = await renderEmailContent(order);

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
