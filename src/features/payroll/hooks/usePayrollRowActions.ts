"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Payroll } from "../interfaces/payroll.interface";
import { payPayrollMutationKey } from "./usePayPayroll";
import { cancelPayrollMutationKey } from "./useCancelPayroll";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Callbacks y "en vuelo" llegan al menú por contexto, NO por la factoría de
// columnas (cambiarlos remontaría todas las celdas). El padre guarda solo ids:
// pagar o cancelar cambia `estado` —un filtro— y la fila puede salir de la
// vista a mitad de la interacción. Mismo patrón que `useProductivityRowActions`.

export interface PayrollRowActionsContextValue {
  onView: (payroll: Payroll) => void;
  onEdit: (payroll: Payroll) => void;
  onPay: (payroll: Payroll) => void;
  onCancel: (payroll: Payroll) => void;
  /** Ids con una acción en vuelo (`usePendingPayrollIds`, calculado en la lista). */
  busyIds: number[];
}

const PayrollRowActionsContext = createContext<PayrollRowActionsContextValue | null>(null);

export const PayrollRowActionsProvider = PayrollRowActionsContext.Provider;

export function usePayrollRowActionsContext(): PayrollRowActionsContextValue {
  const value = useContext(PayrollRowActionsContext);
  if (!value) {
    throw new Error(
      "PayrollRowActionsMenu debe renderizarse dentro de un PayrollRowActionsProvider (ver PayrollList)."
    );
  }
  return value;
}

const ROW_MUTATION_KEYS = new Set<unknown>([
  payPayrollMutationKey[0],
  cancelPayrollMutationKey[0],
]);

/**
 * Ids con una acción EN CURSO (pagar, cancelar), de la `MutationCache`. UNA
 * suscripción, llamada una vez en `PayrollList`; llega a cada menú por el
 * contexto.
 */
export function usePendingPayrollIds(): number[] {
  return useMutationState({
    filters: {
      status: "pending",
      predicate: (mutation) => ROW_MUTATION_KEYS.has(mutation.options.mutationKey?.[0]),
    },
    select: selectMutationRecordId,
  });
}
