"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Shift } from "../interfaces/shift.interface";
import { deactivateShiftMutationKey } from "./useDeleteShift";

export interface ShiftRowActionsContextValue {
  onEdit: (shift: Shift) => void;
  onDeactivate: (shift: Shift) => void;
  /** Ids con una baja en vuelo (`usePendingShiftIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<ShiftRowActionsContextValue>(
  "ShiftNameCell",
  "ShiftList"
);

/** Callbacks y "en vuelo" del menú de fila (`ShiftNameCell`); ver `createRowActionsContext`. */
export const ShiftRowActionsProvider = Provider;
export const useShiftRowActionsContext = useRowActionsContext;

/** Ids de turno con una desactivación en curso. Una sola suscripción, en `ShiftList`. */
export const usePendingShiftIds = () => usePendingRecordIds(deactivateShiftMutationKey);
