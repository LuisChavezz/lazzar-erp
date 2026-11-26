import type { QueryClient } from "@tanstack/react-query";
import type { CancelDialogContent } from "@/src/features/document-cancellation/components/CancelReasonDialog";
import { financeCancelAction } from "@/src/features/finance-cancellation/utils/financeCancelAction";
import { cancelCuentaPorPagar } from "../services/actions";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";
import { canDeleteCuentaPorPagar, hasAppliedPayments } from "./accounts-payable.utils";

/** Prefijo de la llave de la cancelación (el id va en el segundo segmento). */
export const cancelCuentaPorPagarMutationKey = ["cancelar-cuenta-por-pagar"] as const;

/**
 * Qué ofrece el menú para retirar una CxP (EC-950/974):
 * - `delete`: "Eliminar cuenta" (`DELETE` sin motivo, borra la fila).
 * - `cancel`: "Cancelar cuenta" (`DELETE ?motivo=`): tiene pagos ligados, también
 *   los ocultos con `activo=False`, así que el backend la cancela en vez de
 *   borrarla. Con un pago `Aplicado` el backend responde `400` y se muestra tal
 *   cual: aquí no se revisan los pagos.
 * - `pay-first`: solo con un backend que aún no manda `tiene_pagos` y la cuenta
 *   tiene pagos aplicados: la pista de cancelarlos primero, como antes.
 * - `null`: una `Cancelada` (o sin acción posible).
 */
export type CuentaPorPagarRemoval = "delete" | "cancel" | "pay-first" | null;

export const cuentaPorPagarRemoval = (
  cuenta: Pick<CuentaPorPagar, "estatus" | "total_pagado" | "tiene_pagos">,
): CuentaPorPagarRemoval => {
  if (cuenta.estatus === "Cancelada") return null;
  if (cuenta.tiene_pagos === true) return "cancel";
  if (cuenta.tiene_pagos === false) return "delete";
  if (canDeleteCuentaPorPagar(cuenta)) return "delete";
  return hasAppliedPayments(cuenta) ? "pay-first" : null;
};

/** Lo mínimo para cancelar y nombrar la cuenta. */
export type CuentaPorPagarCancelTarget = Pick<CuentaPorPagar, "id" | "factura_proveedor_folio">;

const label = ({ id, factura_proveedor_folio: folio }: CuentaPorPagarCancelTarget) =>
  folio ? `cuenta por pagar #${id} (factura ${folio})` : `cuenta por pagar #${id}`;

/**
 * Lo que mueve cancelarla: las CxP (listado y detalle, por prefijo), los pagos
 * (sus líneas apuntan a ella) y las facturas de proveedor.
 */
const refreshAfterCuentaPorPagarCancel = (queryClient: QueryClient) => {
  for (const queryKey of [["cuentas-por-pagar"], ["pagos"], ["facturas-proveedor"]]) {
    void queryClient.invalidateQueries({ queryKey });
  }
};

/**
 * "Cancelar cuenta" con motivo (`DELETE /finanzas/cuentas-por-pagar/{id}/?motivo=`,
 * nucleo-erp#1356/#1414; exige `CANCELAR-FIN-PAGOS`). El `204` no trae la
 * cuenta: se relee. Un `400` (pago aplicado, ya cancelada) se queda en el
 * diálogo con el mensaje del backend; un `409` (otra operación en curso) va en
 * un toast y el diálogo sigue abierto para reintentar.
 */
export const cuentaPorPagarCancelDialogContent = (
  cuenta: CuentaPorPagarCancelTarget,
): CancelDialogContent<void> => ({
  action: financeCancelAction({
    mutationKey: [...cancelCuentaPorPagarMutationKey, cuenta.id],
    run: (motivo) => cancelCuentaPorPagar(cuenta.id, motivo),
    refresh: refreshAfterCuentaPorPagarCancel,
    documentLabel: "la cuenta por pagar",
    successMessage: () => "Cuenta por pagar cancelada",
  }),
  title: "Cancelar cuenta por pagar",
  description: `La ${label(cuenta)} quedará como Cancelada. No se elimina porque tiene pagos ligados (aunque estén cancelados o eliminados). Esta acción no se puede deshacer.`,
  submitLabel: "Cancelar cuenta",
  pendingLabel: "Cancelando…",
  motivoPlaceholder: "Explica por qué se cancela la cuenta",
  keepOpenOnBlocked: true,
});
