"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Area } from "../interfaces/area.interface";
import { deactivateAreaMutationKey } from "./useDeleteArea";

export interface AreaRowActionsContextValue {
  onEdit: (area: Area) => void;
  onDeactivate: (area: Area) => void;
  /** Ids con una baja en vuelo (`usePendingAreaIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<AreaRowActionsContextValue>(
  "AreaNameCell",
  "AreaList"
);

/** Callbacks y "en vuelo" del menú de fila (`AreaNameCell`); ver `createRowActionsContext`. */
export const AreaRowActionsProvider = Provider;
export const useAreaRowActionsContext = useRowActionsContext;

/** Ids de área con una desactivación en curso. Una sola suscripción, en `AreaList`. */
export const usePendingAreaIds = () => usePendingRecordIds(deactivateAreaMutationKey);
