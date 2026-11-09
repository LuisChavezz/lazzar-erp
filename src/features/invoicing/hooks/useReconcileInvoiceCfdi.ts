import {
  mutationOptions,
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import toast from "react-hot-toast";
import { reconcileInvoiceCfdi } from "../services/actions";
import type { Invoice, InvoiceCfdiReconcileResponse } from "../interfaces/invoice.interface";
import {
  isInvoiceStampPending,
  reconcileInvoiceCfdiErrorMessage,
} from "../utils/invoiceStamping";
import { fetchFreshInvoice, invalidateInvoiceBaseQueries } from "./invoiceActionMutation";
import { PrecheckError, useMutationLock } from "@/src/hooks/useMutationLock";
import { announceCfdiReconcileResult } from "@/src/utils/announceCfdiReconcileResult";

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
 * Mutación que concilia contra Facturama el timbrado sin confirmar de UNA
 * factura (`POST /finanzas/facturas/{id}/conciliar-cfdi/`, EC-709). Mismo
 * esquema que `useStampInvoice`:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   FACTURA (`useMutationLock`).
 * - Antes del POST pide el retrieve FRESCO: si ya no trae `cfdi_pendiente`, NO
 *   se hace el POST y se avisa.
 * - Al terminar, con cualquier resultado, refresca listado, retrieve y desglose.
 *   La respuesta NO se escribe en la caché: el refetch muestra el estado real.
 *   Conciliar no toca estatus, CxC, póliza ni el avance del pedido (ninguna
 *   vista del pedido lee el timbre de sus facturas), así que no se invalida.
 *
 * Con `aviso` (EC-761) el CFDI quedó vigente ante el SAT aunque la factura esté
 * cancelada o eliminada: en lugar del toast de éxito se muestra ese aviso del
 * backend tal cual, como advertencia (`announceCfdiReconcileResult`).
 *
 * Errores: toast con el motivo del backend bajo `cfdi`, tal cual
 * (`reconcileInvoiceCfdiErrorMessage`).
 */
export const reconcileInvoiceCfdiMutationOptions = (
  queryClient: QueryClient,
  invoiceId: number,
) =>
  mutationOptions<ReconcileInvoiceCfdiResult, unknown, void>({
    mutationKey: reconcileInvoiceCfdiMutationKey(invoiceId),
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
      const { resultado, aviso, factura } = result.response;
      announceCfdiReconcileResult({
        resultado,
        aviso,
        noun: "factura",
        label: factura.folio || `#${factura.id}`,
        cfdiUuid: factura.cfdi_uuid,
      });
    },
    onError: (error) => {
      toast.error(
        error instanceof PrecheckError ? error.message : reconcileInvoiceCfdiErrorMessage(error),
      );
    },
    onSettled: (result) =>
      invalidateInvoiceBaseQueries(queryClient, invoiceId, {
        sentRequest: result?.outcome !== "not-pending",
      }),
  });

/**
 * Hook de `reconcileInvoiceCfdiMutationOptions` (ahí el detalle) con el
 * candado por factura.
 */
export const useReconcileInvoiceCfdi = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationOpts = reconcileInvoiceCfdiMutationOptions(queryClient, invoiceId);
  const { isRunning: isReconciling, isIdle } = useMutationLock(mutationOpts.mutationKey);

  const mutation = useMutation(mutationOpts);

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
