import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { toastWarning } from "@/src/utils/toastWarning";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import type { Invoice, InvoiceCancelResponse } from "../interfaces/invoice.interface";
import {
  cancelledInvoiceCfdiNotCancellableMessage,
  isCancelledInvoiceCfdiCancellable,
  isInvoiceCfdiCancelled,
} from "../utils/invoiceCancellation";
import { fetchFreshInvoice } from "./invoiceActionMutation";
import {
  cancelInvoiceMutationErrorMessage,
  cancelInvoiceMutationKey,
  postInvoiceCancel,
} from "./useCancelInvoice";

/**
 * Resultado de cancelar el CFDI de una factura ya `Cancelada`.
 * `not-cancellable`: el retrieve previo encontró la factura ya no elegible
 * (CFDI cancelado, timbrado pendiente, eliminada…) y NO se hizo el POST.
 * `done`: hubo POST con `200`; la respuesta dice si el CFDI quedó cancelado.
 * `requested`: el SAT dejó la cancelación pendiente de que el receptor la
 * acepte (`400` con `cancelacion_pendiente`; el backend SÍ guardó
 * `cfdi_cancelacion_solicitada`).
 */
type CancelCancelledInvoiceCfdiResult =
  | { outcome: "not-cancellable"; invoice: Invoice }
  | { outcome: "done"; invoice: InvoiceCancelResponse }
  | { outcome: "requested"; message: string };

const labelOf = (invoice: { id: number; folio: string | null }) =>
  invoice.folio || `#${invoice.id}`;

/**
 * Cancela ante el SAT el CFDI vigente de una factura que YA está `Cancelada`
 * en el ERP (EC-764), con el mismo `POST /finanzas/facturas/{id}/cancelar/`.
 * Para esa factura el backend solo cancela el CFDI: no cambia estatus, CxC,
 * inventario ni póliza, así que aquí no se invalida nada de eso.
 *
 * - Candado: el MISMO `mutationKey` por factura que `useCancelInvoice` (es el
 *   mismo endpoint).
 * - Antes del POST, el retrieve FRESCO: si ya no es elegible
 *   (`isCancelledInvoiceCfdiCancellable`) no hay POST y se dice por qué.
 * - Sin `motivo`: el backend lo descarta en este caso.
 * - Un `200` no basta: el backend también responde `200` sin efecto. Solo
 *   `cfdi_cancelado === true` en la respuesta es éxito; si no, se avisa que
 *   no se confirmó.
 * - `cancelacion_pendiente` (por la LLAVE) y los `400` de `cfdi`: el texto del
 *   backend tal cual, igual que `useCancelInvoice`.
 * - Al terminar refresca solo el listado y el retrieve de esa factura (el
 *   retrieve no, si el precheck detuvo la acción: acaba de escribirlo).
 */
export const useCancelCancelledInvoiceCfdi = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = cancelInvoiceMutationKey(invoiceId);
  const { isRunning: isCancelling, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<CancelCancelledInvoiceCfdiResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      if (!isCancelledInvoiceCfdiCancellable(current)) {
        return { outcome: "not-cancellable", invoice: current };
      }
      const posted = await postInvoiceCancel({ id: invoiceId });
      return posted.outcome === "requested"
        ? posted
        : { outcome: "done", invoice: posted.invoice };
    },
    onSuccess: (result) => {
      if (result.outcome === "requested") {
        toastWarning(result.message);
        return;
      }
      const { outcome, invoice } = result;
      if (outcome === "not-cancellable") {
        toast.error(cancelledInvoiceCfdiNotCancellableMessage(invoice));
        return;
      }
      if (isInvoiceCfdiCancelled(invoice)) {
        toast.success(`CFDI de la factura ${labelOf(invoice)} cancelado ante el SAT.`);
      } else {
        toastWarning(
          `No se confirmó la cancelación del CFDI de la factura ${labelOf(invoice)} ante el SAT. Revisa el estado del CFDI en el detalle de la factura.`,
        );
      }
    },
    onError: (error) => {
      toast.error(cancelInvoiceMutationErrorMessage(error));
    },
    onSettled: (result) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      if (result?.outcome !== "not-cancellable") {
        queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
      }
    },
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTA factura
   * (consulta síncrona a la caché). `onSettled` corre al terminar, con
   * cualquier resultado.
   */
  const cancelCfdi = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { cancelCfdi, isCancelling, isIdle };
};
