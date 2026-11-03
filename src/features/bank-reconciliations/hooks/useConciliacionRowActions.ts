"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { FinanceWriteAccess } from "@/src/utils/financeWritePermission";
import type { ConciliacionBancaria } from "../interfaces/bank-reconciliation.interface";
import { cerrarConciliacionMutationKey } from "./useCerrarConciliacion";
import { cancelarConciliacionMutationKey } from "./useCancelarConciliacion";

export interface ConciliacionRowActionsContextValue {
  onViewDetail: (conciliacion: ConciliacionBancaria) => void;
  onCerrar: (conciliacion: ConciliacionBancaria) => void;
  onCancelar: (conciliacion: ConciliacionBancaria) => void;
  /** Ids con un cierre o una cancelación en vuelo (`usePendingConciliacionIds`). */
  busyIds: number[];
  /**
   * Permiso de escritura de Finanzas (`useFinanceWriteAccess`). Sin él
   * (`denied`), "Cerrar conciliación" y "Cancelar conciliación" se muestran
   * deshabilitados con su motivo; mientras la sesión carga (`loading`),
   * deshabilitados sin motivo.
   */
  writeAccess: FinanceWriteAccess;
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
