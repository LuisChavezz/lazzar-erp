import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { sendInvoiceCfdi } from "../services/actions";
import { getInvoiceCfdiEmailBlocker, sendInvoiceCfdiErrorMessage } from "../utils/invoiceCfdiEmail";
import { fetchFreshInvoice } from "./invoiceActionMutation";
import { PrecheckError, useMutationLock } from "@/src/hooks/useMutationLock";

/** Candado del envío del CFDI, ÚNICO por factura (ver `useSendInvoiceCfdi`). */
export const sendInvoiceCfdiMutationKey = (invoiceId: number) =>
  ["send-invoice-cfdi", invoiceId] as const;

/**
 * Resultado de enviar. `not-sendable`: el retrieve previo encontró la factura
 * con un motivo de bloqueo (`getInvoiceCfdiEmailBlocker`) y NO se hizo el POST.
 */
export type SendInvoiceCfdiResult =
  | { outcome: "sent"; enviadoA: string }
  | { outcome: "not-sendable"; message: string };

/** Mensaje de un fallo: el del precheck tal cual, o el del backend. */
const errorMessageOf = (error: unknown): string =>
  error instanceof PrecheckError ? error.message : sendInvoiceCfdiErrorMessage(error);

/**
 * Envía por correo el PDF y el XML oficiales del CFDI de UNA factura
 * (`POST /finanzas/facturas/{id}/enviar-cfdi/`).
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   FACTURA (`sendInvoiceCfdiMutationKey`, `useMutationLock`). El envío es
 *   síncrono y puede tardar cerca de un minuto.
 * - Antes del POST pide el retrieve FRESCO (queda escrito en la caché, así que
 *   la cabecera también se actualiza): si la factura ya no admite el envío
 *   (cancelada, CFDI cancelado ante el SAT, timbrado pendiente, sin CFDI o
 *   eliminada) NO se hace el POST y se avisa con el motivo. El backend no
 *   rechaza esos casos, así que este precheck es la única barrera.
 * - No invalida nada: enviar no cambia ningún dato.
 *
 * Errores: el mensaje del backend tal cual (`sendInvoiceCfdiErrorMessage`), en
 * un toast y en el `onError` de la llamada, para que el diálogo lo muestre.
 */
export const useSendInvoiceCfdi = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = sendInvoiceCfdiMutationKey(invoiceId);
  const { isRunning: isSending, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<SendInvoiceCfdiResult, unknown, string>({
    mutationKey,
    mutationFn: async (email) => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      const blocker = getInvoiceCfdiEmailBlocker(current);
      if (blocker) return { outcome: "not-sendable", message: blocker.message };
      const { enviado_a } = await sendInvoiceCfdi({ id: invoiceId, email });
      return { outcome: "sent", enviadoA: enviado_a };
    },
    onSuccess: (result) => {
      if (result.outcome === "not-sendable") {
        toast.error(result.message);
        return;
      }
      toast.success(`CFDI enviado a ${result.enviadoA}`);
    },
    onError: (error) => {
      toast.error(errorMessageOf(error));
    },
  });

  /**
   * Dispara el envío salvo que ya haya uno en vuelo para ESTA factura (consulta
   * síncrona a la caché). `onSuccess` corre al terminar sin error (enviado o
   * detenido por el precheck, que ya avisó); `onError`, con el mismo mensaje
   * que el toast.
   */
  const send = (
    email: string,
    options: { onSuccess?: () => void; onError?: (message: string) => void } = {},
  ) => {
    if (!isIdle()) return;
    mutation.mutate(email, {
      onSuccess: () => options.onSuccess?.(),
      onError: (error) => options.onError?.(errorMessageOf(error)),
    });
  };

  return { send, isSending };
};
