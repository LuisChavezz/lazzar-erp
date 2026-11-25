import type { QueryClient } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { financeCancelAction } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { cancelarPago } from "../services/actions";
import type { Pago } from "../interfaces/payment.interface";

/**
 * Prefijo de la llave de la cancelación: `usePendingPaymentIds` lee de él los
 * pagos en vuelo (el id va en el segundo segmento, `selectMutationRecordId`).
 */
export const cancelPagoMutationKey = ["cancel-pago"] as const;

/** Escribe el pago que respondió `cancelar/` en el listado antes de releer (EC-927). */
const writePagoToList = (queryClient: QueryClient, pago: Pago) => {
  if (!pago || typeof pago.id !== "number") return;
  queryClient.setQueriesData({ queryKey: ["pagos"] }, (current: unknown) =>
    Array.isArray(current)
      ? (current as Pago[]).map((row) => (row.id === pago.id ? { ...row, ...pago } : row))
      : current,
  );
};

/**
 * Lo que mueve cancelar un pago: el listado de pagos, las CxP aplicadas (vuelven
 * a su saldo), el movimiento bancario de ESTE pago (queda `Cancelado`), el saldo
 * y el resumen de la cuenta bancaria y las pólizas (contrapóliza).
 */
const refreshAfterPagoCancel = (queryClient: QueryClient, pagoId: number) => {
  for (const queryKey of [
    ["pagos"],
    ["cuentas-por-pagar"],
    ["movimientos-por-pago", pagoId],
    ["bank-accounts"],
    ["bank-account-summary"],
    ["polizas"],
  ]) {
    void queryClient.invalidateQueries({ queryKey });
  }
};

/**
 * "Cancelar pago" con motivo (`POST /finanzas/pagos/{id}/cancelar/`,
 * nucleo-erp#1356, EC-950; exige `CANCELAR-FIN-PAGOS`). Solo se ofrece sobre un
 * pago `Aplicado`: nunca por `DELETE`, que lo saca del listado (o lo borra) y
 * con él el rastro de la cancelación.
 */
export const pagoCancelDialogContent = (pagoId: number): CancelDialogContent<Pago> => ({
  action: financeCancelAction({
    mutationKey: [...cancelPagoMutationKey, pagoId],
    run: (motivo) => cancelarPago(pagoId, motivo),
    applyResult: writePagoToList,
    refresh: (queryClient) => refreshAfterPagoCancel(queryClient, pagoId),
    documentLabel: "el pago",
    successMessage: () => "Pago cancelado correctamente",
  }),
  title: "Cancelar pago",
  description: `El pago #${pagoId} quedará como Cancelado: se revertirán los saldos de las cuentas por pagar aplicadas, su movimiento bancario quedará cancelado y se generará la contrapóliza. El pago se conserva en el listado. Esta acción no se puede deshacer.`,
  submitLabel: "Cancelar pago",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela el pago",
});
