import type { QueryClient } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { financeCancelAction } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { PrecheckError } from "@/src/hooks/useMutationLock";
import { cancelarConciliacion } from "../services/actions";
import type { ConciliacionBancaria, ConciliacionEstatus } from "../interfaces/bank-reconciliation.interface";
import { fetchFreshConciliacion } from "../hooks/fetchFreshConciliacion";
import { invalidateMovimientoQueries } from "../hooks/invalidateMovimientoQueries";
import { CONCILIACIONES_KEY_ROOT } from "../hooks/useConciliaciones";

/**
 * Prefijo de la llave de la cancelación: `usePendingConciliacionIds` lee de él
 * las conciliaciones en vuelo (el id va en el segundo segmento,
 * `selectMutationRecordId`).
 */
export const cancelarConciliacionMutationKey = ["cancelar-conciliacion"] as const;

/**
 * Texto de la confirmación de cancelar, según el estatus VERIFICADO. `cambio`:
 * el servidor dijo otro estatus que el listado, y se avisa antes de la pregunta.
 */
export const cancelarConciliacionDescription = (
  cuenta: string,
  estatus: ConciliacionEstatus,
  cambio: boolean,
): string => {
  const aviso = cambio ? `El estatus cambió desde que se cargó el listado: ahora está ${estatus}. ` : "";
  return estatus === "Cerrada"
    ? `${aviso}La conciliación cerrada de ${cuenta} quedará como Cancelada: los movimientos que conciliaba regresarán a Pendiente (salvo los que ampare otra conciliación cerrada) y el periodo quedará libre para volver a prepararse. Se conserva en el listado.`
    : `${aviso}La conciliación de ${cuenta} quedará como Cancelada y el periodo queda libre para volver a prepararse. Se conserva en el listado.`;
};

/** Por qué no se manda el `POST`: la conciliación cambió desde que se abrió la confirmación. */
const changedSinceOpenedMessage = (estatus: ConciliacionEstatus) =>
  estatus === "Cerrada"
    ? "La conciliación se cerró mientras confirmabas: cancelarla ahora regresaría sus movimientos a Pendiente. Se actualizó el listado."
    : `La conciliación ya está ${estatus.toLowerCase()}; ya no se puede cancelar como se describía. Se actualizó el listado.`;

/** Escribe la conciliación que respondió `cancelar/` en TODAS las entradas del listado (EC-927). */
const writeConciliacionToList = (queryClient: QueryClient, conciliacion: ConciliacionBancaria) => {
  if (!conciliacion || typeof conciliacion.id !== "number") return;
  queryClient.setQueriesData<ConciliacionBancaria[]>({ queryKey: CONCILIACIONES_KEY_ROOT }, (old) =>
    Array.isArray(old) ? old.map((row) => (row.id === conciliacion.id ? { ...row, ...conciliacion } : row)) : old,
  );
};

/**
 * "Cancelar conciliación" con motivo
 * (`POST /finanzas/conciliaciones-bancarias/{id}/cancelar/`, nucleo-erp#1356,
 * EC-950; exige `CANCELAR-FIN-BANCOS`). Se ofrece sobre un `Borrador` y sobre
 * una `Cerrada` (nucleo-erp #827), con efectos distintos: `estatus` es el que
 * describe el texto. Justo antes del `POST` se relee la conciliación: si su
 * estatus ya no es ese, no se cancela (`PrecheckError`) — nunca con un efecto
 * que no se avisó. Al terminar se releen el listado y los movimientos.
 */
export const conciliacionCancelDialogContent = (
  queryClient: QueryClient,
  { id, cuenta, estatus, cambio }: { id: number; cuenta: string; estatus: ConciliacionEstatus; cambio: boolean },
): CancelDialogContent<ConciliacionBancaria> => ({
  action: financeCancelAction({
    mutationKey: [...cancelarConciliacionMutationKey, id],
    run: async (motivo) => {
      const fresh = await fetchFreshConciliacion(queryClient, id);
      // Sin respuesta no se sabe el estatus: un `Error` simple deja el diálogo
      // abierto para reintentar.
      if (fresh.kind === "error") {
        throw new Error("No se pudo verificar el estado de la conciliación. Intenta de nuevo.");
      }
      if (fresh.kind === "gone") throw new PrecheckError("La conciliación ya no está disponible. Se actualizó el listado.");
      if (fresh.conciliacion.estatus !== estatus) {
        throw new PrecheckError(changedSinceOpenedMessage(fresh.conciliacion.estatus));
      }
      return cancelarConciliacion(id, motivo);
    },
    applyResult: writeConciliacionToList,
    refresh: (client) => {
      void invalidateMovimientoQueries(client);
      void client.invalidateQueries({ queryKey: CONCILIACIONES_KEY_ROOT });
    },
    blockingKeys: ["movimiento_bancario"],
    documentLabel: "la conciliación",
    successMessage: () =>
      estatus === "Cerrada"
        ? "Conciliación cancelada: sus movimientos regresaron a Pendiente"
        : "Conciliación cancelada correctamente",
  }),
  title: "Cancelar conciliación",
  description: cancelarConciliacionDescription(cuenta, estatus, cambio),
  submitLabel: "Cancelar conciliación",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la conciliación",
});
