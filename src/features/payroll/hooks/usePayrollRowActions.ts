"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Payroll } from "../interfaces/payroll.interface";
import { payPayrollMutationKey } from "./usePayPayroll";
import { cancelPayrollMutationKey } from "./useCancelPayroll";

/**
 * El padre guarda solo ids: pagar o cancelar cambia `estado` —un filtro— y la
 * fila puede salir de la vista a mitad de la interacción. Mismo patrón que
 * `useProductivityRowActions`.
 */
export interface PayrollRowActionsContextValue {
  onView: (payroll: Payroll) => void;
  onEdit: (payroll: Payroll) => void;
  onPay: (payroll: Payroll) => void;
  onCancel: (payroll: Payroll) => void;
  /** Ids con una acción en vuelo (`usePendingPayrollIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<PayrollRowActionsContextValue>(
  "PayrollNameCell",
  "PayrollList"
);

/** Callbacks y "en vuelo" del menú de fila (`PayrollNameCell`); ver `createRowActionsContext`. */
export const PayrollRowActionsProvider = Provider;
export const usePayrollRowActionsContext = useRowActionsContext;

/** Ids con una acción EN CURSO (pagar, cancelar). Una sola suscripción, en `PayrollList`. */
export const usePendingPayrollIds = () =>
  usePendingRecordIds(payPayrollMutationKey, cancelPayrollMutationKey);
