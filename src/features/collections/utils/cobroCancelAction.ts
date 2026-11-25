import type { QueryClient } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { getCuentaPorCobrarDetail } from "@/src/features/accounts-receivable/services/actions";
import { financeCancelAction } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { PrecheckError, toPrecheckError } from "@/src/hooks/useMutationLock";
import { cancelCobro, getCobro } from "../services/actions";
import type { Cobro } from "../interfaces/collection.interface";
import { invalidateCobroEffects, writeCobroToList } from "../hooks/cobroQueryCache";
import { COBRO_CANCEL_UNCONFIRMED_MESSAGE, getCobroCancelBlockReason } from "./cobroCancellation";
import { cobroLabel } from "./collection.utils";

/** Lo mínimo para cancelar y describir el cobro. */
export type CollectionCancelTarget = Pick<Cobro, "id" | "folio" | "estatus">;

/** Candado de la cancelación, ÚNICO por cobro. */
export const cancelCobroMutationKey = (cobroId: number) => ["cancel-cobro", cobroId] as const;

/**
 * Lectura previa al `POST`: el cobro FRESCO (se escribe en el listado) y, por
 * id, la CxC FRESCA de cada una de sus líneas, para volver a evaluar
 * `getCobroCancelBlockReason`. Si mientras el diálogo estaba abierto el cobro
 * ganó un REP, se canceló, o se canceló una de sus facturas (o una CxC no se
 * pudo consultar), lanza `PrecheckError` con el motivo y no hay `POST`.
 */
const precheckCobroCancel = async (queryClient: QueryClient, cobroId: number) => {
  let current: Cobro;
  try {
    current = await getCobro(cobroId);
  } catch (error) {
    throw toPrecheckError(error, "No se pudo consultar el cobro.");
  }
  writeCobroToList(queryClient, current);
  // Solo las CxC de SUS líneas, en paralelo. Una que no responda (404 si es de
  // otra empresa o no existe, red) queda fuera del índice y la cancelación se
  // bloquea: no se puede saber si su factura está cancelada.
  const cxcIds = [...new Set(current.cobro_detalles.map((linea) => linea.cxc))];
  const settled = await Promise.allSettled(cxcIds.map((id) => getCuentaPorCobrarDetail(id)));
  const cxcIndex = new Map(
    settled.flatMap((result) => (result.status === "fulfilled" ? [[result.value.id, result.value] as const] : [])),
  );
  // No se escribe en la caché del listado de CxC (esta respuesta no es esa lista
  // y una petición en vuelo podría pisarla): se invalida para que el detalle la
  // relea.
  void queryClient.invalidateQueries({ queryKey: ["accounts-receivable"] });
  const blockReason = getCobroCancelBlockReason(current, cxcIndex);
  if (blockReason) throw new PrecheckError(blockReason);
};

/**
 * "Cancelar cobro" con motivo (`POST /finanzas/cobros/{id}/cancelar/`,
 * nucleo-erp#1356, EC-950), en `CancelReasonDialog`. Antes del `POST` relee el
 * cobro y sus CxC (`precheckCobroCancel`). Al terminar bien escribe el cobro
 * cancelado en el listado y relee todo lo que la reversión mueve
 * (`invalidateCobroEffects`, el mismo conjunto que registrar un cobro). El
 * `400 rep` (el cobro tiene REP) se muestra tal cual y cierra el diálogo; sin
 * respuesta del backend se relee todo y el diálogo sigue abierto.
 *
 * El texto depende del estatus: un `Aplicado` revierte saldos de CxC, banco y
 * póliza; un `Borrador` nunca movió nada, así que no se promete reversión.
 */
export const cobroCancelDialogContent = (
  queryClient: QueryClient,
  cobro: CollectionCancelTarget,
): CancelDialogContent<Cobro> => {
  const label = cobroLabel(cobro);
  return {
    action: financeCancelAction({
      mutationKey: cancelCobroMutationKey(cobro.id),
      run: async (motivo) => {
        await precheckCobroCancel(queryClient, cobro.id);
        return cancelCobro(cobro.id, motivo);
      },
      applyResult: (client, result) => writeCobroToList(client, result),
      refresh: invalidateCobroEffects,
      blockingKeys: ["rep"],
      documentLabel: "el cobro",
      unconfirmedMessage: COBRO_CANCEL_UNCONFIRMED_MESSAGE,
      successMessage: (result) => `Cobro ${cobroLabel(result)} cancelado`,
    }),
    title: "Cancelar cobro",
    description:
      cobro.estatus === "Borrador"
        ? `El cobro ${label} quedará como Cancelado. Es un borrador: no movió saldos, banco ni póliza, así que no hay nada que revertir. Esta acción no se puede deshacer.`
        : `El cobro ${label} quedará como Cancelado: el saldo de sus cuentas por cobrar vuelve a quedar pendiente, se descuenta de la cuenta bancaria, su movimiento bancario se cancela y se genera la contrapóliza. Esta acción no se puede deshacer.`,
    submitLabel: "Cancelar cobro",
    pendingLabel: "Cancelando…",
    motivoPlaceholder: "Explica por qué se cancela el cobro",
  };
};
