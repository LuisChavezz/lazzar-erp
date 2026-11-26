"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { FinanceCancelState, FinanceWriteState } from "@/src/utils/financeWrite";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";

export interface AccountsPayableRowActionsContextValue {
  onViewDetail: (cuenta: CuentaPorPagar) => void;
  onDelete: (cuenta: CuentaPorPagar) => void;
  /** "Cancelar cuenta" con motivo: una cuenta con `tiene_pagos` (EC-950/974). */
  onCancel: (cuenta: CuentaPorPagar) => void;
  onGoToPayments: () => void;
  /** "Hoy" en la zona del backend, calculado UNA vez por la vista (marca de vencida). */
  today: string;
  /** Ids con un borrado en vuelo (candado de la lista). */
  busyIds: number[];
  /**
   * Estado de escritura de Finanzas (`getFinanceWriteState`). Sin el
   * permiso, "Eliminar cuenta" se muestra deshabilitado con su motivo.
   */
  write: FinanceWriteState;
  /** Escritura más `CANCELAR-FIN-PAGOS` (`getFinanceCancelState`), para "Cancelar cuenta". */
  cancel: FinanceCancelState;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<AccountsPayableRowActionsContextValue>(
    "AccountsPayableIdCell",
    "AccountsPayableList",
  );

/** Callbacks y "en vuelo" del menú de fila (`AccountsPayableIdCell`); ver `createRowActionsContext`. */
export const AccountsPayableRowActionsProvider = Provider;
export const useAccountsPayableRowActionsContext = useRowActionsContext;
