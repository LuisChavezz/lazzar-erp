"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Banco } from "../interfaces/bank.interface";
import { toggleBankActivoMutationKey } from "./useToggleBankActivo";

export interface BankRowActionsContextValue {
  onEdit: (banco: Banco) => void;
  onToggleActivo: (banco: Banco) => void;
  /** Ids con un cambio de `activo` en vuelo (`usePendingBankIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<BankRowActionsContextValue>(
  "BankNameCell",
  "BankList"
);

/** Callbacks y "en vuelo" del menú de fila (`BankNameCell`); ver `createRowActionsContext`. */
export const BankRowActionsProvider = Provider;
export const useBankRowActionsContext = useRowActionsContext;

/** Ids de banco con un cambio de `activo` en curso. Una sola suscripción, en `BankList`. */
export const usePendingBankIds = () => usePendingRecordIds(toggleBankActivoMutationKey);
