import type { QueryClient } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { financeCancelAction } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { formatShortDate } from "@/src/utils/formatDate";
import { cancelMovimientoBancario } from "../services/actions";
import type { MovimientoCuentaBancaria } from "../interfaces/bank-account.interface";

/** Prefijo de la llave de la cancelación (el id va en el segundo segmento). */
export const cancelMovimientoBancarioMutationKey = ["cancel-movimiento-bancario"] as const;

/**
 * ¿Es un movimiento MANUAL? El que no nace de un cobro ni de un pago: es la
 * misma regla con que el backend lo acepta en `cancelar/`
 * (`MovimientoBancarioService.revertir_movimiento`; uno ligado responde
 * `400 movimiento_bancario`, "se cancelan desde su documento origen"). `origen`
 * no sirve: el de un cobro también se guarda como `Manual`.
 */
export const isManualMovimiento = (movimiento: Pick<MovimientoCuentaBancaria, "cobro_id" | "pago_id">): boolean =>
  movimiento.cobro_id === null && movimiento.pago_id === null;

/** ¿Se ofrece "Cancelar" sobre este movimiento? Manual y no cancelado. */
export const canCancelMovimiento = (
  movimiento: Pick<MovimientoCuentaBancaria, "cobro_id" | "pago_id" | "estatus">,
): boolean => isManualMovimiento(movimiento) && movimiento.estatus !== "Cancelado";

/**
 * Lo que mueve cancelar un movimiento: el resumen de la cuenta (saldo y
 * últimos movimientos), el listado de cuentas (`saldo_actual`), los movimientos
 * de conciliación y las pólizas (contrapóliza).
 */
const refreshAfterMovimientoCancel = (queryClient: QueryClient) => {
  for (const queryKey of [["bank-account-summary"], ["bank-accounts"], ["conciliaciones-bancarias"], ["polizas"]]) {
    void queryClient.invalidateQueries({ queryKey });
  }
};

/**
 * "Cancelar" un movimiento bancario manual con motivo
 * (`POST /finanzas/movimientos-bancarios/{id}/cancelar/`, nucleo-erp#1356,
 * EC-950; exige `CANCELAR-FIN-BANCOS`). Nunca por `DELETE`: el movimiento no se
 * borra, queda `Cancelado` en el listado con su saldo revertido y su
 * contrapóliza.
 */
export const movimientoCancelDialogContent = (
  movimiento: Pick<MovimientoCuentaBancaria, "id" | "fecha" | "concepto">,
): CancelDialogContent<unknown> => {
  const fecha = formatShortDate(movimiento.fecha, { timeZone: "UTC" });
  const nombre = movimiento.concepto?.trim() ? `"${movimiento.concepto.trim()}" del ${fecha}` : `del ${fecha}`;
  return {
    action: financeCancelAction({
      mutationKey: [...cancelMovimientoBancarioMutationKey, movimiento.id],
      run: (motivo) => cancelMovimientoBancario(movimiento.id, motivo),
      refresh: refreshAfterMovimientoCancel,
      blockingKeys: ["movimiento_bancario"],
      documentLabel: "el movimiento bancario",
      successMessage: () => "Movimiento bancario cancelado",
    }),
    title: "Cancelar movimiento bancario",
    description: `El movimiento ${nombre} quedará como Cancelado: se revierte su efecto en el saldo de la cuenta y se genera la contrapóliza. Se conserva en el listado. Esta acción no se puede deshacer.`,
    submitLabel: "Cancelar movimiento",
    pendingLabel: "Cancelando…",
    motivoPlaceholder: "Explica por qué se cancela el movimiento",
  };
};
