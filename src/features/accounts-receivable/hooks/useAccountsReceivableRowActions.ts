"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import type { CuentaPorCobrarRow } from "../interfaces/accounts-receivable.interface";

export interface AccountsReceivableRowActionsContextValue {
  /** Abre el detalle de la cuenta. El diálogo vive en `AccountsReceivableList`. */
  onViewDetail: (cuenta: CuentaPorCobrarRow) => void;
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<AccountsReceivableRowActionsContextValue>(
    "AccountsReceivableFolioCell",
    "AccountsReceivableList",
  );

/** Callbacks del menú de fila (`AccountsReceivableFolioCell`); ver `createRowActionsContext`. */
export const AccountsReceivableRowActionsProvider = Provider;
export const useAccountsReceivableRowActionsContext = useRowActionsContext;
