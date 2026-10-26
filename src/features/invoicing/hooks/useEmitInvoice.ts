import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { ordersQueryKey } from "@/src/features/orders/hooks/useOrders";
import { invalidatePedidoProgress } from "@/src/features/orders/hooks/invalidatePedidoProgress";
import { PrecheckError, useMutationLock } from "@/src/hooks/useMutationLock";
import { emitInvoice, patchInvoice } from "../services/actions";
import type { Invoice } from "../interfaces/invoice.interface";
import { emitInvoiceErrorMessage, isInvoiceEmittable } from "../utils/invoiceEmission";
import { isSameTipoCambio, requiresInvoiceTipoCambio } from "../utils/invoiceCurrency";
import { invoiceRetrieveFreshOptions } from "./useInvoiceRetrieveFresh";
import {
  fetchFreshInvoice,
  invalidateInvoiceBaseQueries,
} from "./invoiceActionMutation";

/** Candado de la emisión, ÚNICO por factura (ver `useEmitInvoice`). */
export const emitInvoiceMutationKey = (invoiceId: number) =>
  ["emit-invoice", invoiceId] as const;

/**
 * Resultado de emitir. `not-emittable`: el retrieve previo encontró la factura
 * ya fuera de `Borrador` (otra persona la emitió o canceló) o eliminada, y NO
 * se hizo ningún PATCH ni POST.
 */
export type EmitInvoiceResult =
  | { outcome: "emitted"; invoice: Invoice }
  | { outcome: "not-emittable"; invoice: Invoice };

interface EmitInvoiceVariables {
  /** Tipo de cambio capturado y normalizado; `null` en MXN (no se manda). */
  tipoCambio: string | null;
}

/**
 * Emite UNA factura `Borrador`: fuera de MXN guarda antes su tipo de cambio
 * (`PATCH /finanzas/facturas/{id}/`) y luego la emite
 * (`POST /finanzas/facturas/{id}/emitir/`). Mismo esquema que `useCancelInvoice`:
 *
 * - Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 *   FACTURA (`emitInvoiceMutationKey`, `useMutationLock`).
 * - Antes de escribir pide el retrieve FRESCO: si la factura ya no es un
 *   `Borrador` activo no se hace nada y se avisa.
 * - El PATCH solo va fuera de MXN y si el valor cambió: si el `Borrador` ya
 *   traía ese tipo de cambio se emite directo. Nunca se manda en MXN.
 * - Si el PATCH pasa y `emitir/` falla, la factura queda en `Borrador` con el
 *   tipo de cambio ya guardado (el retrieve en caché se actualiza con la
 *   respuesta del PATCH); el diálogo sigue abierto con el error para
 *   reintentar, y el reintento ya no repite el PATCH.
 *
 * Errores: el mensaje de `tipo_cambio` —del PATCH o el que `emitir/` devuelve
 * cuando falta— va al campo (`onFieldError`) y no a un toast; cualquier otro,
 * al toast y al `onError` de la llamada (`emitInvoiceErrorMessage`).
 *
 * Al TERMINAR, si hubo petición (con éxito o error: una respuesta perdida pudo
 * emitirla), refresca el listado, el retrieve y el desglose de la factura y lo
 * que emitir crea o cambia: las cuentas por cobrar (listado y detalle), las
 * pólizas, los clientes de contabilidad (su saldo), y el pedido (su 360°, su
 * trazabilidad y su lista: una factura emitida bloquea la edición del pedido).
 */
export const useEmitInvoice = (invoiceId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = emitInvoiceMutationKey(invoiceId);
  const { isRunning: isEmitting, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<EmitInvoiceResult, unknown, EmitInvoiceVariables>({
    mutationKey,
    mutationFn: async ({ tipoCambio }) => {
      const current = await fetchFreshInvoice(queryClient, invoiceId);
      if (!isInvoiceEmittable(current)) return { outcome: "not-emittable", invoice: current };
      if (
        tipoCambio !== null &&
        requiresInvoiceTipoCambio(current) &&
        !isSameTipoCambio(tipoCambio, current.tipo_cambio)
      ) {
        const patched = await patchInvoice({ id: invoiceId, tipo_cambio: tipoCambio });
        queryClient.setQueryData(invoiceRetrieveFreshOptions(invoiceId).queryKey, patched);
      }
      const { factura } = await emitInvoice(invoiceId);
      return { outcome: "emitted", invoice: factura };
    },
    onSuccess: ({ outcome, invoice }) => {
      const label = invoice.folio || `#${invoice.id}`;
      if (outcome === "not-emittable") {
        toast.error(`La factura ${label} ya no está en Borrador; no se emitió.`);
        return;
      }
      toast.success(`Factura ${label} emitida: se generó su cuenta por cobrar.`);
    },
    onError: (error) => {
      if (drfFieldMessage(error, "tipo_cambio")) return;
      toast.error(error instanceof PrecheckError ? error.message : emitInvoiceErrorMessage(error));
    },
    // Si el precheck detuvo la acción, el retrieve ya está fresco en la caché.
    onSettled: (result) => {
      const sentRequest = result?.outcome !== "not-emittable";
      invalidateInvoiceBaseQueries(queryClient, invoiceId, { sentRequest });
      if (!sentRequest) return;
      // Prefijos: alcanzan también las variantes con filtros y los detalles.
      void invalidatePedidoProgress(queryClient);
      queryClient.invalidateQueries({ queryKey: ordersQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
      queryClient.invalidateQueries({ queryKey: ["accounts-receivable-detail"] });
      queryClient.invalidateQueries({ queryKey: ["polizas"] });
      queryClient.invalidateQueries({ queryKey: ["accounting-customers"] });
    },
  });

  /**
   * Dispara la emisión salvo que ya haya una en vuelo para ESTA factura
   * (consulta síncrona a la caché). `onSuccess` corre si terminó sin error
   * (emitida, o ya no emitible: en los dos casos el diálogo se cierra);
   * `onFieldError` recibe el mensaje del backend para el tipo de cambio y
   * `onError` el de cualquier otro fallo (el mismo del toast).
   */
  const emit = (
    { tipoCambio }: EmitInvoiceVariables,
    options: {
      onSuccess?: () => void;
      onFieldError?: (message: string) => void;
      onError?: (message: string) => void;
    } = {},
  ) => {
    if (!isIdle()) return;
    mutation.mutate(
      { tipoCambio },
      {
        onSuccess: () => options.onSuccess?.(),
        onError: (error) => {
          const fieldMessage = drfFieldMessage(error, "tipo_cambio");
          if (fieldMessage) {
            options.onFieldError?.(fieldMessage);
            return;
          }
          options.onError?.(
            error instanceof PrecheckError ? error.message : emitInvoiceErrorMessage(error),
          );
        },
      },
    );
  };

  return { emit, isEmitting };
};
