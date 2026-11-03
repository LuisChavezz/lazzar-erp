import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { reconcileInvoiceCfdi } from "../services/actions";
import type { Invoice, InvoiceCfdiReconcileResponse } from "../interfaces/invoice.interface";
import {
  isInvoiceStampPending,
  reconcileInvoiceCfdiErrorMessage,
} from "../utils/invoiceStamping";
import { fetchFreshInvoice, invalidateInvoiceBaseQueries } from "./invoiceActionMutation";
import { PrecheckError, useMutationLock } from "@/src/hooks/useMutationLock";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";

/** Candado de la conciliación, ÚNICO por factura (ver `useReconcileInvoiceCfdi`). */
export const reconcileInvoiceCfdiMutationKey = (invoiceId: number) =>
  ["reconcile-invoice-cfdi", invoiceId] as const;

/**
 * Resultado de conciliar. `not-pending`: el retrieve previo encontró la
 * factura ya sin timbrado pendiente (otra sesión lo resolvió) y NO se hizo el
 * POST.
 */
export type ReconcileInvoiceCfdiResult =
  | { outcome: "reconciled"; response: InvoiceCfdiReconcileResponse }
  | { outcome: "not-pending"; invoice: Invoice };

/**
 * Concilia contra Facturama el timbrado sin confirmar de UNA factura
 * (`POST /finanzas/facturas/{id}/conciliar-cfdi/`, EC-709). Mismo esquema que
 * `useStampInvoice`:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   FACTURA (`useMutationLock`).
 * - Antes del POST pide el retrieve FRESCO: si ya no trae `cfdi_pendiente`, NO
 *   se hace el POST y se avisa.
 * - Al terminar, con cualquier resultado, refresca listado, retrieve y desglose
 *   (y el avance del pedido si hubo POST, como el timbrado). La respuesta NO se
 *   escribe en la caché: el refetch muestra el estado real. Conciliar no toca
 *   estatus, CxC ni póliza.
 *
 * Errores: toast con el motivo del backend bajo `cfdi`, tal cual
 * (`reconcileInvoiceCfdiErrorMessage`).
 */
export const useReconcileInvoiceCfdi = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = reconcileInvoiceCfdiMutationKey(invoiceId);
  const { isRunning: isReconciling, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<ReconcileInvoiceCfdiResult, unknown, void>({
    mutationKey,
    mutationFn: async () => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      if (!isInvoiceStampPending(current)) return { outcome: "not-pending", invoice: current };
      const response = await reconcileInvoiceCfdi(invoiceId);
      return { outcome: "reconciled", response };
    },
    onSuccess: (result) => {
      if (result.outcome === "not-pending") {
        const label = result.invoice.folio || `#${result.invoice.id}`;
        toast.error(`La factura ${label} ya no tiene un timbrado pendiente de confirmación.`);
        return;
      }
      const { resultado, factura } = result.response;
      const label = factura.folio || `#${factura.id}`;
      if (resultado === "timbrado") {
        toast.success(
          factura.cfdi_uuid
            ? `El CFDI de la factura ${label} sí existía en Facturama: la factura ya está timbrada. UUID ${factura.cfdi_uuid}`
            : `El CFDI de la factura ${label} sí existía en Facturama: la factura ya está timbrada.`,
        );
        return;
      }
      toast.success(
        `Facturama no tenía ningún CFDI de la factura ${label}: el timbrado pendiente se liberó y ya puedes timbrarla o cancelarla.`,
      );
    },
    onError: (error) => {
      toast.error(
        error instanceof PrecheckError ? error.message : reconcileInvoiceCfdiErrorMessage(error),
      );
    },
    onSettled: (result) => {
      const sentRequest = result?.outcome !== "not-pending";
      if (sentRequest) void invalidatePedidoProgress(queryClient);
      invalidateInvoiceBaseQueries(queryClient, invoiceId, { sentRequest });
    },
  });

  /**
   * Dispara la conciliación salvo que ya haya una en vuelo para ESTA factura
   * (consulta síncrona a la caché). `onSettled` corre al terminar, con
   * cualquier resultado.
   */
  const reconcile = (options: { onSettled?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate(undefined, { onSettled: options.onSettled });
  };

  return { reconcile, isReconciling, isIdle };
};
