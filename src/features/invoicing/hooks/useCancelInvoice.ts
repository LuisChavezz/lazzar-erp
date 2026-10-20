import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ordersQueryKey } from "@/src/features/orders/hooks/useOrders";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { pedidoTrazabilidadQueryKey } from "@/src/features/orders/hooks/usePedidoTrazabilidad";
import { cancelInvoice } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";
import { INVOICE_STATUS } from "../constants/invoiceStatus";
import {
  cancelInvoiceErrorMessage,
  getInvoiceCancelBlockReason,
  isInvoiceCancellable,
  isInvoiceCfdiCancelled,
} from "../utils/invoiceCancellation";
import { isInvoiceStamped } from "../utils/invoiceStamping";
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
 * o con el timbrado pendiente de confirmación) y NO se hizo el POST.
 * `needs-confirmation`: la factura se timbró después de abrir el diálogo, que
 * no avisó del SAT; NO se hizo el POST y hay que volver a confirmar.
 */
export type CancelInvoiceResult =
  | { outcome: "cancelled"; invoice: Invoice }
  | { outcome: "not-cancellable"; invoice: Invoice }
  | { outcome: "needs-confirmation"; invoice: Invoice };

/** Lo que manda el diálogo: la nota y si su aviso ya mencionaba el CFDI. */
interface CancelInvoiceVariables {
  motivo?: string;
  /** ¿El diálogo mostraba la factura timbrada (con el aviso del SAT)? */
  shownStamped: boolean;
}

/**
 * ¿Hay que detener la cancelación para volver a confirmar? Solo si el retrieve
 * fresco trae un CFDI vigente (`cfdi_uuid` sin `cfdi_cancelado`) que el
 * diálogo no mostraba: `cancelar/` lo cancelaría ante el SAT sin que el
 * usuario lo viera advertido. El caso inverso (el diálogo avisó del SAT y el
 * CFDI ya está cancelado) no se detiene: el backend se salta el SAT.
 */
const stampedSinceShown = (current: Invoice, shownStamped: boolean): boolean =>
  !shownStamped && isInvoiceStamped(current) && !isInvoiceCfdiCancelled(current);

/** Mensaje de un fallo: el del precheck tal cual, o el del backend. */
const errorMessageOf = (error: unknown): string =>
  error instanceof InvoicePrecheckError ? error.message : cancelInvoiceErrorMessage(error);

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
 * el POST y se avisa. Tampoco si trae `cfdi_pendiente` (pudo quedar así después
 * de cargar la vista; ver `getInvoiceCancelBlockReason`). Una factura timbrada
 * SÍ se cancela: `cancelar/` cancela antes su CFDI ante el SAT. Si se timbró
 * DESPUÉS de abrir el diálogo (que entonces no avisaba del SAT), tampoco hay
 * POST: el resultado `needs-confirmation` le pasa al diálogo la factura fresca
 * para que muestre el aviso y pida confirmar de nuevo (`stampedSinceShown`).
 * Esa comparación vive aquí y no en `fetchFreshInvoice`, que es compartido con
 * el timbrado y solo trae y cachea el retrieve: qué vio el usuario es una
 * regla de la cancelación.
 *
 * Al TERMINAR, con cualquier resultado, refresca el listado, el retrieve y el
 * desglose de esa factura. Tras una cancelación real refresca además lo que
 * depende de ella: las piezas pendientes del pedido (onboarding), el pedido
 * 360° y su lista, las cuentas por cobrar (listado y detalle: su CxC pasa a
 * cancelada), las pólizas (contrapóliza de una Emitida) y los clientes de
 * contabilidad (saldo a favor por los cobros que se conservan).
 *
 * Errores: el mensaje del backend tal cual (`cancelInvoiceErrorMessage`: el
 * `400` de `cfdi` cuando el SAT o Facturama no cancelaron el CFDI, o el de
 * `estatus` por notas de crédito), en un toast y en el `onError` de la llamada,
 * para que el diálogo lo muestre también. Ningún `400` guarda nada.
 */
export const useCancelInvoice = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = cancelInvoiceMutationKey(invoiceId);
  const { isRunning: isCancelling, isIdle } = useInvoiceMutationLock(mutationKey);

  const mutation = useMutation<CancelInvoiceResult, unknown, CancelInvoiceVariables>({
    mutationKey,
    mutationFn: async ({ motivo, shownStamped }) => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      if (!isInvoiceCancellable(current) || getInvoiceCancelBlockReason(current) !== null) {
        return { outcome: "not-cancellable", invoice: current };
      }
      if (stampedSinceShown(current, shownStamped)) {
        return { outcome: "needs-confirmation", invoice: current };
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
      // El diálogo muestra el aviso y pide confirmar de nuevo; no hay toast.
      if (outcome === "needs-confirmation") return;
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
      toast.success(
        isInvoiceCfdiCancelled(invoice)
          ? `Factura ${label} cancelada; su CFDI quedó cancelado ante el SAT.`
          : `Factura ${label} cancelada`,
      );
    },
    onError: (error) => {
      toast.error(errorMessageOf(error));
    },
    // Si el precheck detuvo la acción, el retrieve ya está fresco en la caché.
    onSettled: (result) =>
      invalidateInvoiceBaseQueries(queryClient, invoiceId, {
        sentRequest: result === undefined || result.outcome === "cancelled",
      }),
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTA factura
   * (consulta síncrona a la caché). `shownStamped`: si el diálogo mostraba la
   * factura timbrada. `onSuccess` corre solo si terminó sin error y sin pedir
   * reconfirmación; `onNeedsConfirmation` recibe la factura fresca cuando se
   * timbró después de abrir el diálogo; `onError`, el mismo mensaje que el toast.
   */
  const cancel = (
    { motivo, shownStamped }: CancelInvoiceVariables,
    options: {
      onSuccess?: () => void;
      onNeedsConfirmation?: (invoice: Invoice) => void;
      onError?: (message: string) => void;
    } = {},
  ) => {
    if (!isIdle()) return;
    mutation.mutate(
      { motivo, shownStamped },
      {
        onSuccess: (result) =>
          result.outcome === "needs-confirmation"
            ? options.onNeedsConfirmation?.(result.invoice)
            : options.onSuccess?.(),
        onError: (error) => options.onError?.(errorMessageOf(error)),
      },
    );
  };

  return { cancel, isCancelling };
};
