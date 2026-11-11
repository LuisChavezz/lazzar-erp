"use client";

import { useMutation, useMutationState, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { googleSendEmail } from "@/src/features/google/services/actions";
import { buildGoogleEmailAttachment } from "@/src/features/google/utils/googleEmailAttachment.utils";
import { renderEmailContent, type SendEmailResult } from "@/src/features/google/utils/emailSend.utils";
import type { GoogleEmailPayload } from "@/src/features/google/interfaces/google.interface";
import { useSendEmailConfirmation } from "@/src/features/google/hooks/useSendEmailConfirmation";
import { assertEmailSnapshotUnchanged } from "@/src/features/google/utils/sendEmailFlow";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import { requirePdfCompany, usePdfCompany } from "@/src/hooks/usePdfCompany";
import { documentPdfFileName } from "@/src/pdfs/shared/documentPdfFileName";
import { generatePurchaseOrderPdfBlob } from "../services/pdf/purchaseOrderPdfBlob";
import { purchaseOrderEmailRenderInputs } from "../utils/purchaseOrderEmailRenderInputs";
import { getPurchaseOrderEmailBlocker } from "../utils/purchaseOrderEmailBlocker";
import type { PurchaseOrderDetail } from "../interfaces/purchase-order.interface";
import { purchaseOrderQueryOptions } from "./usePurchaseOrder";

export const PURCHASE_ORDER_EMAIL_STALE_MESSAGE =
  "La orden de compra cambió desde que preparaste el correo, así que no se envió. Vuelve a intentarlo para revisar la versión actual.";

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
 * Lee la orden SIEMPRE fresca (`staleTime: 0` fuerza el GET, igual que
 * "Descargar PDF") y aplica `getPurchaseOrderEmailBlocker`: las guardas tienen
 * que ver el estatus y los importes REALES, no unos cacheados hasta 15 min.
 * Si el estatus ya no permite enviarla, refresca el listado para que la fila
 * muestre su estatus real. Lo usan preparar Y enviar.
 */
const fetchSendablePurchaseOrder = async (
  queryClient: QueryClient,
  orderId: number,
): Promise<PurchaseOrderDetail> => {
  const order = await queryClient.fetchQuery({
    ...purchaseOrderQueryOptions(orderId),
    staleTime: 0,
  });
  const blocker = getPurchaseOrderEmailBlocker(order);
  if (blocker) {
    if (blocker.reason === "status") {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    }
    throw new Error(blocker.message);
  }
  return order;
};

/**
 * Paso 1: obtiene la orden y renderiza el correo al PROVEEDOR, SIN enviarlo.
 * Todo el acceso al backend externo ocurre client-side via v1_api (cookies
 * auth-jwt/auth-refresh-jwt + interceptor de refresh).
 *
 * 1. `fetchSendablePurchaseOrder` — GET fresco + guardas de estatus e importes.
 * 2. renderEmailContent() — API Route Next.js: valida `proveedor_correo` +
 *    sesión y renderiza el HTML en Node.js. El `to` que devuelve es el correo
 *    del proveedor, y es lo que muestra el diálogo.
 */
export const usePreparePurchaseOrderEmail = () => {
  const queryClient = useQueryClient();
  // El adjunto lleva la empresa en el encabezado (EC-855): sin datos reales de
  // ella no se prepara un correo que luego no podría enviarse.
  const pdfCompany = usePdfCompany();

  return useMutation<PreparedPurchaseOrderEmail, unknown, number>({
    mutationKey: preparePurchaseOrderEmailMutationKey,
    mutationFn: async (orderId: number): Promise<PreparedPurchaseOrderEmail> => {
      requirePdfCompany(pdfCompany);
      const order = await fetchSendablePurchaseOrder(queryClient, orderId);
      const content = await renderEmailContent(`/api/purchase-orders/${order.id}/send-email`, {
        order,
      });

      return {
        id: order.id,
        label: order.folio || `#${order.id}`,
        order,
        content,
        // Mismo nombre que "Descargar PDF" (EC-855): el archivo adjunto y el
        // descargado se llaman igual.
        attachmentName: documentPdfFileName("OC", order.folio, order.id),
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
 * Paso 2, solo tras confirmar: vuelve a leer la orden, la revalida y, si sigue
 * IGUAL a la foto que se preparó, genera el PDF y envía el correo (v1_api
 * POST, cookies + interceptor de refresh).
 *
 * Entre preparar y confirmar la confirmación puede quedar abierta: si otro
 * usuario canceló la orden, la regresó a pendiente o la editó, se aborta sin
 * enviar —nunca sale una versión distinta de la que el usuario confirmó—. Se
 * compara lo que se RENDERIZA (`purchaseOrderEmailRenderInputs`): un cambio que
 * no se ve en el correo ni en el PDF (avance de recepciones, auditoría) no
 * aborta.
 *
 * El PDF se genera con el MISMO generador que "Descargar PDF"
 * (generatePurchaseOrderPdfBlob) a partir de la MISMA foto con la que se
 * renderizó el correo, por lo que el adjunto es idéntico al documento
 * descargable. La validación de tamaño (25 MB sobre el payload base64 real) se
 * delega en `buildGoogleEmailAttachment`.
 */
export const useSendPurchaseOrderEmail = () => {
  const queryClient = useQueryClient();
  // Empresa activa del encabezado del PDF adjunto (EC-855), con la misma regla
  // que "Descargar PDF" (`usePdfCompany`).
  const pdfCompany = usePdfCompany();

  return useMutation<SendEmailResult, unknown, PreparedPurchaseOrderEmail>({
    mutationKey: sendPurchaseOrderEmailMutationKey,
    mutationFn: async ({ id, order, content, attachmentName }): Promise<SendEmailResult> => {
      const current = await fetchSendablePurchaseOrder(queryClient, id);
      assertEmailSnapshotUnchanged(
        purchaseOrderEmailRenderInputs(current),
        purchaseOrderEmailRenderInputs(order),
        PURCHASE_ORDER_EMAIL_STALE_MESSAGE,
      );

      const company = requirePdfCompany(pdfCompany);
      const pdfBlob = await generatePurchaseOrderPdfBlob(order, company);
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
};

/**
 * "Enviar correo" del listado con confirmación, para `PurchaseOrderView`
 * (`useSendEmailConfirmation`): la confirmación vive en la vista y no en la
 * celda, que se desmonta al ordenar o paginar. `request(id)` PREPARA el correo
 * y `dialog` son las props de `PurchaseOrderSendEmailConfirmDialog`; nada se
 * envía hasta confirmar.
 */
export function usePurchaseOrderEmailConfirmation() {
  const { mutateAsync: prepareEmail } = usePreparePurchaseOrderEmail();
  const { mutate: sendEmail } = useSendPurchaseOrderEmail();

  return useSendEmailConfirmation<PreparedPurchaseOrderEmail>({
    busyMutationKeys: [preparePurchaseOrderEmailMutationKey, sendPurchaseOrderEmailMutationKey],
    prepare: prepareEmail,
    send: sendEmail,
  });
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
