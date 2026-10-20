import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { stampInvoice } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";
import {
  INVOICE_STAMP_PENDING_MESSAGE,
  isInvoiceStampPending,
  isInvoiceStampable,
  stampInvoiceErrorMessage,
} from "../utils/invoiceStamping";
import {
  InvoicePrecheckError,
  fetchFreshInvoice,
  invalidateInvoiceBaseQueries,
  useInvoiceMutationLock,
} from "./invoiceActionMutation";

/** Candado del timbrado, ÚNICO por factura (ver `useStampInvoice`). */
export const stampInvoiceMutationKey = (invoiceId: number) =>
  ["stamp-invoice", invoiceId] as const;

/**
 * Resultado de timbrar. `not-stampable`: el retrieve previo encontró la
 * factura ya timbrada, con un timbrado pendiente de confirmación, o ya no
 * `Emitida` y activa, y NO se hizo el POST.
 */
export type StampInvoiceResult =
  | { outcome: "stamped"; invoice: Invoice }
  | { outcome: "not-stampable"; invoice: Invoice };

/**
 * Timbra el CFDI de UNA factura (`POST /finanzas/facturas/{id}/timbrar/`), un
 * acto fiscal irreversible. Mismo esquema que `useCancelInvoice`:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   FACTURA (`stampInvoiceMutationKey`, `useInvoiceMutationLock`).
 * - Antes del POST pide el retrieve FRESCO: si la factura ya trae `cfdi_uuid`
 *   (la timbró otra persona), `cfdi_pendiente` (timbrado sin confirmar) o dejó
 *   de ser una `Emitida` activa, NO se hace el POST y se avisa.
 * - Al TERMINAR, con cualquier resultado, refresca solo el listado, el retrieve
 *   y el desglose de esa factura: el timbrado no toca estatus, CxC ni póliza.
 *
 * Errores: toast con el mensaje de `cfdi` o `estatus` (`stampInvoiceErrorMessage`).
 */
export const useStampInvoice = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = stampInvoiceMutationKey(invoiceId);
  const { isRunning: isStamping, isIdle } = useInvoiceMutationLock(mutationKey);

  const mutation = useMutation<StampInvoiceResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      if (!isInvoiceStampable(current) || isInvoiceStampPending(current)) {
        return { outcome: "not-stampable", invoice: current };
      }
      const invoice = await stampInvoice(invoiceId);
      return { outcome: "stamped", invoice };
    },
    onSuccess: ({ outcome, invoice }) => {
      const label = invoice.folio || `#${invoice.id}`;
      if (outcome === "not-stampable") {
        toast.error(
          invoice.cfdi_uuid
            ? `La factura ${label} ya estaba timbrada (UUID ${invoice.cfdi_uuid}).`
            : isInvoiceStampPending(invoice)
              ? INVOICE_STAMP_PENDING_MESSAGE
              : `La factura ${label} ya no puede timbrarse.`,
        );
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["pedido-detail"] });
      void queryClient.invalidateQueries({ queryKey: ["pedido-trazabilidad"] });
      toast.success(
        invoice.cfdi_uuid
          ? `Factura ${label} timbrada. UUID ${invoice.cfdi_uuid}`
          : `Factura ${label} timbrada`,
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof InvoicePrecheckError ? error.message : stampInvoiceErrorMessage(error),
      );
    },
    // Si el precheck detuvo la acción, el retrieve ya está fresco en la caché.
    onSettled: (result) =>
      invalidateInvoiceBaseQueries(queryClient, invoiceId, {
        sentRequest: result?.outcome !== "not-stampable",
      }),
  });

  /**
   * Dispara el timbrado salvo que ya haya uno en vuelo para ESTA factura
   * (consulta síncrona a la caché). `onSettled` corre al terminar, con
   * cualquier resultado.
   */
  const stamp = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { stamp, isStamping };
};
