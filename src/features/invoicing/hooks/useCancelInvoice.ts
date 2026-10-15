import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ordersQueryKey } from "@/src/features/orders/hooks/useOrders";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { pedidoTrazabilidadQueryKey } from "@/src/features/orders/hooks/usePedidoTrazabilidad";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { firstDrfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelInvoice } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import { isInvoiceCancellable } from "../utils/invoiceCancellation";
import { invoiceDesgloseQueryKey } from "./useInvoiceDesglose";
import { invoiceOnboardingQueryKey } from "./useInvoiceOnboarding";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";

/** Candado de la cancelación, ÚNICO por factura (ver `useCancelInvoice`). */
export const cancelInvoiceMutationKey = (invoiceId: number) =>
  ["cancel-invoice", invoiceId] as const;

/**
 * Resultado de cancelar. `not-cancellable`: el retrieve previo encontró la
 * factura ya `Cancelada` (u otra que dejó de ser cancelable, p. ej. eliminada)
 * y NO se hizo el POST.
 */
export type CancelInvoiceResult =
  | { outcome: "cancelled"; invoice: Invoice }
  | { outcome: "not-cancellable"; invoice: Invoice };

/** Motivo propio de un fallo antes del POST (el retrieve previo no respondió). */
class CancelInvoicePrecheckError extends Error {}

/**
 * Cancela UNA factura (`POST /finanzas/facturas/{id}/cancelar/`).
 *
 * Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 * FACTURA (`cancelInvoiceMutationKey`), igual que `useCreateAndOpenQuote`.
 * `cancel` lo consulta de forma SÍNCRONA contra la caché de mutaciones
 * (`isPending` llega un render tarde), así que sobrevive a un remontaje y es el
 * mismo para el diálogo del listado y el del detalle.
 *
 * Antes del POST pide el retrieve FRESCO: cancelar una ya cancelada responde
 * `200` sin efecto y sin guardar el motivo, y la respuesta no distingue ese
 * caso de una cancelación real. Si la factura ya no es cancelable no se hace
 * el POST y se avisa.
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
  const isCancelling = useIsMutating({ mutationKey, exact: true }) > 0;

  const mutation = useMutation<CancelInvoiceResult, unknown, { motivo?: string }>({
    mutationKey,
    mutationFn: async ({ motivo }) => {
      let current: Invoice;
      try {
        current = await queryClient.fetchQuery(invoiceRetrieveFreshOptions(invoiceId));
      } catch (error) {
        throw new CancelInvoicePrecheckError(
          extractErrorMessage(error, "No se pudo consultar la factura."),
        );
      }
      if (!isInvoiceCancellable(current)) {
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
            : `La factura ${label} ya no puede cancelarse.`,
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
        error instanceof CancelInvoicePrecheckError
          ? error.message
          : (firstDrfFieldMessage(error) ??
              extractErrorMessage(error, "No se pudo cancelar la factura.")),
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice-detail", invoiceId] });
      queryClient.invalidateQueries({ queryKey: invoiceDesgloseQueryKey(invoiceId) });
    },
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTA factura
   * (consulta síncrona a la caché). `onSuccess` corre solo si terminó sin error.
   */
  const cancel = (motivo: string | undefined, options: { onSuccess?: () => void } = {}) => {
    if (queryClient.isMutating({ mutationKey, exact: true }) > 0) return;
    mutation.mutate({ motivo }, { onSuccess: options.onSuccess });
  };

  return { cancel, isCancelling };
};
