"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Position } from "../interfaces/position.interface";
import { deactivatePositionMutationKey } from "./useDeletePosition";

export interface PositionRowActionsContextValue {
  onEdit: (position: Position) => void;
  onDeactivate: (position: Position) => void;
  /** Ids con una baja en vuelo (`usePendingPositionIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<PositionRowActionsContextValue>(
  "PositionNameCell",
  "PositionList"
);

/** Callbacks y "en vuelo" del menú de fila (`PositionNameCell`); ver `createRowActionsContext`. */
export const PositionRowActionsProvider = Provider;
export const usePositionRowActionsContext = useRowActionsContext;

/** Ids de puesto con una desactivación en curso. Una sola suscripción, en `PositionList`. */
export const usePendingPositionIds = () => usePendingRecordIds(deactivatePositionMutationKey);
