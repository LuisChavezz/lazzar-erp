"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { CuentaBancaria } from "../interfaces/bank-account.interface";
import { toggleBankAccountActivoMutationKey } from "./useToggleBankAccountActivo";

export interface BankAccountRowActionsContextValue {
  onViewSummary: (cuenta: CuentaBancaria) => void;
  onEdit: (cuenta: CuentaBancaria) => void;
  onToggleActivo: (cuenta: CuentaBancaria) => void;
  /** Ids con un cambio de `activo` en vuelo (`usePendingBankAccountIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<BankAccountRowActionsContextValue>("BankAccountNameCell", "BankAccountList");

/** Callbacks y "en vuelo" del menú de fila (`BankAccountNameCell`); ver `createRowActionsContext`. */
export const BankAccountRowActionsProvider = Provider;
export const useBankAccountRowActionsContext = useRowActionsContext;

/** Ids de cuenta bancaria con un cambio de `activo` en curso. Una sola suscripción, en `BankAccountList`. */
export const usePendingBankAccountIds = () =>
  usePendingRecordIds(toggleBankAccountActivoMutationKey);
