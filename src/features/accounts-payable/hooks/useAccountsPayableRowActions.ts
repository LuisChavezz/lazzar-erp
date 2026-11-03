"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { CuentaPorPagar } from "../interfaces/accounts-payable.interface";

export interface AccountsPayableRowActionsContextValue {
  onViewDetail: (cuenta: CuentaPorPagar) => void;
  onDelete: (cuenta: CuentaPorPagar) => void;
  onGoToPayments: () => void;
  /** "Hoy" en la zona del backend, calculado UNA vez por la vista (marca de vencida). */
  today: string;
  /** Ids con un borrado en vuelo (candado de la lista). */
  busyIds: number[];
  /**
   * ¿El usuario puede escribir en Finanzas? (`FINANCE_WRITE_PERMISSION`). Sin el
   * permiso, "Eliminar cuenta" se muestra deshabilitado con su motivo.
   */
  canWrite: boolean;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<AccountsPayableRowActionsContextValue>(
    "AccountsPayableIdCell",
    "AccountsPayableList",
  );

/** Callbacks y "en vuelo" del menú de fila (`AccountsPayableIdCell`); ver `createRowActionsContext`. */
export const AccountsPayableRowActionsProvider = Provider;
export const useAccountsPayableRowActionsContext = useRowActionsContext;
