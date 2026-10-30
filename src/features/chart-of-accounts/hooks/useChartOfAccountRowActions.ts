"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { CuentaContable } from "../interfaces/chart-of-account.interface";
import { toggleChartOfAccountActivoMutationKey } from "./useToggleChartOfAccountActivo";

export interface ChartOfAccountRowActionsContextValue {
  onViewDetail: (cuenta: CuentaContable) => void;
  onEdit: (cuenta: CuentaContable) => void;
  onToggleActivo: (cuenta: CuentaContable) => void;
  /** Ids con un cambio de `activo` en vuelo (`usePendingChartOfAccountIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<ChartOfAccountRowActionsContextValue>(
    "ChartOfAccountNameCell",
    "ChartOfAccountList",
  );

/** Callbacks y "en vuelo" del menú de fila (`ChartOfAccountNameCell`); ver `createRowActionsContext`. */
export const ChartOfAccountRowActionsProvider = Provider;
export const useChartOfAccountRowActionsContext = useRowActionsContext;

/** Ids de cuenta contable con un cambio de `activo` en curso. Una sola suscripción, en `ChartOfAccountList`. */
export const usePendingChartOfAccountIds = () =>
  usePendingRecordIds(toggleChartOfAccountActivoMutationKey);
