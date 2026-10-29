"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Shift } from "../interfaces/shift.interface";
import { deactivateShiftMutationKey } from "./useDeleteShift";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`ShiftNameCell`) por contexto, NO por la
// factoría de columnas: si el "en vuelo" viajara dentro de `getColumns(...)`,
// cada inicio y fin de una acción crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas. Mismo patrón que `useEmployeeRowActions`.

export interface ShiftRowActionsContextValue {
  onEdit: (shift: Shift) => void;
  onDeactivate: (shift: Shift) => void;
  /** Ids con una baja en vuelo (`usePendingShiftIds`, calculado en la lista). */
  busyIds: number[];
}

const ShiftRowActionsContext = createContext<ShiftRowActionsContextValue | null>(null);

export const ShiftRowActionsProvider = ShiftRowActionsContext.Provider;

/** Para `ShiftNameCell`: exige estar bajo un `ShiftRowActionsProvider`. */
export function useShiftRowActionsContext(): ShiftRowActionsContextValue {
  const value = useContext(ShiftRowActionsContext);
  if (!value) {
    throw new Error("ShiftNameCell debe renderizarse dentro de un ShiftRowActionsProvider (ver ShiftList).");
  }
  return value;
}

/**
 * Ids de turno con una desactivación EN CURSO, leídos de la `MutationCache` y
 * no del `useMutation`, que solo recuerda su ÚLTIMA llamada. Una sola
 * suscripción, en `ShiftList`; llega a cada menú por el contexto.
 */
export function usePendingShiftIds(): number[] {
  return useMutationState({
    filters: { status: "pending", mutationKey: deactivateShiftMutationKey },
    select: selectMutationRecordId,
  });
}
