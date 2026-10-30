"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { CostCenter } from "../interfaces/cost-center.interface";
import { toggleCostCenterActivoMutationKey } from "./useToggleCostCenterActivo";

export interface CostCenterRowActionsContextValue {
  onViewDetail: (centro: CostCenter) => void;
  onEdit: (centro: CostCenter) => void;
  onToggleActivo: (centro: CostCenter) => void;
  /** Ids con una baja/reactivación en vuelo (`usePendingCostCenterIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } =
  createRowActionsContext<CostCenterRowActionsContextValue>("CostCenterNameCell", "CostCenterList");

/** Callbacks y "en vuelo" del menú de fila (`CostCenterNameCell`); ver `createRowActionsContext`. */
export const CostCenterRowActionsProvider = Provider;
export const useCostCenterRowActionsContext = useRowActionsContext;

/** Ids de centro de costo con un cambio de `activo` en curso. Una sola suscripción, en `CostCenterList`. */
export const usePendingCostCenterIds = () => usePendingRecordIds(toggleCostCenterActivoMutationKey);
