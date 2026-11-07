import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { toastWarning } from "@/src/utils/toastWarning";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import type { Invoice, InvoiceCancelResponse } from "../interfaces/invoice.interface";
import {
  cancelledInvoiceCfdiNotCancellableMessage,
  isCancelledInvoiceCfdiCancellable,
  isInvoiceCfdiCancellationRequested,
  isInvoiceCfdiCancelled,
  isSatCancelMotiveLockedElsewhere,
} from "../utils/invoiceCancellation";
import type { SatCancelMotive } from "@/src/constants/satCancelMotives";
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
 * `needs-confirmation`: la cancelación quedó solicitada DESPUÉS de abrir el
 * diálogo, que no avisaba que confirmar vuelve a consultar al SAT, o el motivo
 * SAT quedó fijo en otro distinto del elegido; NO se hizo el POST y el
 * diálogo pide confirmar de nuevo con la factura fresca.
 * `done`: hubo POST con `200`; la respuesta dice si el CFDI quedó cancelado.
 * `requested`: el SAT dejó la cancelación pendiente de que el receptor la
 * acepte (`400` con `cancelacion_pendiente`; el backend SÍ guardó
 * `cfdi_cancelacion_solicitada`).
 */
type CancelCancelledInvoiceCfdiResult =
  | { outcome: "not-cancellable"; invoice: Invoice }
  | { outcome: "needs-confirmation"; invoice: Invoice }
  | { outcome: "done"; invoice: InvoiceCancelResponse }
  | { outcome: "requested"; message: string };

const labelOf = (invoice: { id: number; folio: string | null }) =>
  invoice.folio || `#${invoice.id}`;

/** Lo que manda el diálogo. Los dos campos son obligatorios: omitir uno no compila. */
interface CancelCancelledInvoiceCfdiVariables {
  /** ¿El diálogo mostraba la cancelación ya solicitada (con su aviso)? */
  shownRequested: boolean;
  /** Motivo SAT elegido, o el fijo: este caso siempre cancela un CFDI vigente. */
  motivoSat: SatCancelMotive;
}

/**
 * Cancela ante el SAT el CFDI vigente de una factura que YA está `Cancelada`
 * en el ERP (EC-764), con el mismo `POST /finanzas/facturas/{id}/cancelar/`.
 * Para esa factura el backend solo cancela el CFDI: no cambia estatus, CxC,
 * inventario ni póliza, así que aquí no se invalida nada de eso.
 *
 * - Candado: el MISMO `mutationKey` por factura que `useCancelInvoice` (es el
 *   mismo endpoint).
 * - Antes del POST, el retrieve FRESCO: si ya no es elegible
 *   (`isCancelledInvoiceCfdiCancellable`) no hay POST y se dice por qué; si
 *   la cancelación quedó solicitada después de abrir el diálogo
 *   (`shownRequested` falso) o el motivo SAT quedó fijo en otro distinto del
 *   elegido (`isSatCancelMotiveLockedElsewhere`), tampoco: `needs-confirmation`,
 *   como en `useCancelInvoice`. Un CFDI que ya estaba cancelado es un aviso ℹ️, no
 *   un error: lo que se buscaba ya ocurrió.
 * - Manda `motivo_sat` (obligatorio: siempre cancela un CFDI vigente). No
 *   manda la nota interna `motivo`: el diálogo no la pide (el backend sí la
 *   guardaría en `observaciones` desde EC-806).
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

  const mutation = useMutation<
    CancelCancelledInvoiceCfdiResult,
    unknown,
    CancelCancelledInvoiceCfdiVariables
  >({
    mutationKey,
    mutationFn: async ({ shownRequested, motivoSat }) => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      if (!isCancelledInvoiceCfdiCancellable(current)) {
        return { outcome: "not-cancellable", invoice: current };
      }
      if (
        (!shownRequested && isInvoiceCfdiCancellationRequested(current)) ||
        isSatCancelMotiveLockedElsewhere(current, motivoSat)
      ) {
        return { outcome: "needs-confirmation", invoice: current };
      }
      const posted = await postInvoiceCancel({ id: invoiceId, motivoSat });
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
        const message = cancelledInvoiceCfdiNotCancellableMessage(invoice);
        if (isInvoiceCfdiCancelled(invoice)) toast(message, { icon: "ℹ️" });
        else toast.error(message);
        return;
      }
      // El diálogo muestra el aviso y pide confirmar de nuevo; no hay toast.
      if (outcome === "needs-confirmation") return;
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
      // Sin POST, el precheck acaba de escribir el retrieve en la caché.
      if (result?.outcome !== "not-cancellable" && result?.outcome !== "needs-confirmation") {
        queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
      }
    },
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTA factura
   * (consulta síncrona a la caché). `shownRequested`: si el diálogo mostraba
   * la cancelación ya solicitada; `motivoSat`: el motivo que va al SAT. `onDone` corre al terminar con cualquier
   * resultado salvo `needs-confirmation`, que en su lugar pasa la factura
   * fresca a `onNeedsConfirmation`.
   */
  const cancelCfdi = (
    variables: CancelCancelledInvoiceCfdiVariables,
    options: { onDone?: () => void; onNeedsConfirmation?: (invoice: Invoice) => void } = {},
  ) => {
    if (!isIdle()) return;
    mutation.mutate(
      variables,
      {
        onSuccess: (result) =>
          result.outcome === "needs-confirmation"
            ? options.onNeedsConfirmation?.(result.invoice)
            : options.onDone?.(),
        onError: () => options.onDone?.(),
      },
    );
  };

  return { cancelCfdi, isCancelling, isIdle };
};
