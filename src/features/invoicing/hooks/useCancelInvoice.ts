import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ordersQueryKey } from "@/src/features/orders/hooks/useOrders";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { pedidoTrazabilidadQueryKey } from "@/src/features/orders/hooks/usePedidoTrazabilidad";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelInvoice } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import { getInvoiceCancelBlockReason, isInvoiceCancellable } from "../utils/invoiceCancellation";
import { invoiceOnboardingQueryKey } from "./useInvoiceOnboarding";
import {
  InvoicePrecheckError,
  fetchFreshInvoice,
  invalidateInvoiceBaseQueries,
  useInvoiceMutationLock,
} from "./invoiceActionMutation";

/** Candado de la cancelación, ÚNICO por factura (ver `useCancelInvoice`). */
export const cancelInvoiceMutationKey = (invoiceId: number) =>
  ["cancel-invoice", invoiceId] as const;

/**
 * Resultado de cancelar. `not-cancellable`: el retrieve previo encontró la
 * factura ya `Cancelada` (u otra que dejó de ser cancelable, p. ej. eliminada
 * o con el CFDI timbrado o pendiente de confirmación) y NO se hizo el POST.
 */
export type CancelInvoiceResult =
  | { outcome: "cancelled"; invoice: Invoice }
  | { outcome: "not-cancellable"; invoice: Invoice };

/**
 * Cancela UNA factura (`POST /finanzas/facturas/{id}/cancelar/`).
 *
 * Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 * FACTURA (`cancelInvoiceMutationKey`), igual que `useCreateAndOpenQuote`
 * (`useInvoiceMutationLock`): el mismo para el diálogo del listado y el del
 * detalle.
 *
 * Antes del POST pide el retrieve FRESCO: cancelar una ya cancelada responde
 * `200` sin efecto y sin guardar el motivo, y la respuesta no distingue ese
 * caso de una cancelación real. Si la factura ya no es cancelable no se hace
 * el POST y se avisa. Tampoco si ya trae `cfdi_uuid` o `cfdi_pendiente` (pudo
 * timbrarse después de cargar la vista; ver `getInvoiceCancelBlockReason`).
 *
 * Al TERMINAR, con cualquier resultado, refresca el listado, el retrieve y el
 * desglose de esa factura. Tras una cancelación real refresca además lo que
 * depende de ella: las piezas pendientes del pedido (onboarding), el pedido
 * 360° y su lista, las cuentas por cobrar (listado y detalle: su CxC pasa a
 * cancelada), las pólizas (contrapóliza de una Emitida) y los clientes de
 * contabilidad (saldo a favor por los cobros que se conservan).
 *
 * Errores: toast con el mensaje del backend. El `400` de notas de crédito
 * llega como `{ "estatus": ... }`, sin la clave `error` que lee
 * `extractErrorMessage`, así que se antepone `firstDrfFieldMessage`.
 */
export const useCancelInvoice = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = cancelInvoiceMutationKey(invoiceId);
  const { isRunning: isCancelling, isIdle } = useInvoiceMutationLock(mutationKey);

  const mutation = useMutation<CancelInvoiceResult, unknown, { motivo?: string }>({
    mutationKey,
    mutationFn: async ({ motivo }) => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      if (!isInvoiceCancellable(current) || getInvoiceCancelBlockReason(current) !== null) {
        return { outcome: "not-cancellable", invoice: current };
      }
      const invoice = await cancelInvoice({ id: invoiceId, motivo });
      return { outcome: "cancelled", invoice };
    },
    onSuccess: ({ outcome, invoice }) => {
      const label = invoice.folio || `#${invoice.id}`;
      if (outcome === "not-cancellable") {
        toast.error(
          invoice.estatus === INVOICE_STATUS.CANCELADA
            ? `La factura ${label} ya estaba cancelada; no se registró el motivo.`
            : (getInvoiceCancelBlockReason(invoice) ??
              `La factura ${label} ya no puede cancelarse.`),
        );
        return;
      }
      if (invoice.pedido) {
        queryClient.invalidateQueries({ queryKey: invoiceOnboardingQueryKey(invoice.pedido) });
        queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(invoice.pedido) });
        queryClient.invalidateQueries({ queryKey: pedidoTrazabilidadQueryKey(invoice.pedido) });
      }
      // Prefijos: alcanzan también las variantes con filtros y los detalles.
      queryClient.invalidateQueries({ queryKey: ordersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable-detail"] });
      queryClient.invalidateQueries({ queryKey: ["polizas"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-customers"] });
      toast.success(`Factura ${label} cancelada`);
    },
    onError: (error) => {
      toast.error(
        error instanceof InvoicePrecheckError
          ? error.message
          : (firstDrfFieldMessage(error) ??
              extractErrorMessage(error, "No se pudo cancelar la factura.")),
      );
    },
    // Si el precheck detuvo la acción, el retrieve ya está fresco en la caché.
    onSettled: (result) =>
      invalidateInvoiceBaseQueries(queryClient, invoiceId, {
        sentRequest: result?.outcome !== "not-cancellable",
      }),
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTA factura
   * (consulta síncrona a la caché). `onSuccess` corre solo si terminó sin error.
   */
  const cancel = (motivo: string | undefined, options: { onSuccess?: () => void } = {}) => {
    if (!isIdle()) return;
    mutation.mutate({ motivo }, { onSuccess: options.onSuccess });
  };

  return { cancel, isCancelling };
};
