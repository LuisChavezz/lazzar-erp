"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { FinanceCancelState, FinanceWriteState } from "@/src/utils/financeWrite";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { ConciliacionBancaria } from "../interfaces/bank-reconciliation.interface";
import { cerrarConciliacionMutationKey } from "./useCerrarConciliacion";
import { cancelarConciliacionMutationKey } from "../utils/conciliacionCancelAction";

export interface ConciliacionRowActionsContextValue {
  onViewDetail: (conciliacion: ConciliacionBancaria) => void;
  onCerrar: (conciliacion: ConciliacionBancaria) => void;
  onCancelar: (conciliacion: ConciliacionBancaria) => void;
  /**
   * Estado de escritura de Finanzas (`getFinanceWriteState`). Sin el
   * permiso, "Cerrar conciliación" y "Cancelar conciliación" se muestran
   * deshabilitados con su motivo.
   */
  write: FinanceWriteState;
  /**
   * Estado de la cancelación (`getFinanceCancelState`: escritura más
   * `CANCELAR-FIN-BANCOS`, EC-950). Sin él, "Cancelar conciliación" se muestra
   * deshabilitada con su motivo.
   */
  cancel: FinanceCancelState;
  /** Ids con un cierre o una cancelación en vuelo (`usePendingConciliacionIds`). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<ConciliacionRowActionsContextValue>(
    "ConciliacionCuentaCell",
    "BankReconciliationView",
  );

/** Callbacks y "en vuelo" del menú de fila (`ConciliacionCuentaCell`); ver `createRowActionsContext`. */
export const ConciliacionRowActionsProvider = Provider;
export const useConciliacionRowActionsContext = useRowActionsContext;

/** Ids de conciliación con un cierre o una cancelación en curso. Una sola suscripción, en la vista. */
export const usePendingConciliacionIds = () =>
  usePendingRecordIds(cerrarConciliacionMutationKey, cancelarConciliacionMutationKey);
