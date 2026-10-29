"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Position } from "../interfaces/position.interface";
import { deactivatePositionMutationKey } from "./useDeletePosition";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`PositionNameCell`) por contexto, NO por la
// factoría de columnas: si el "en vuelo" viajara dentro de `getColumns(...)`,
// cada inicio y fin de una acción crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas. Mismo patrón que `useEmployeeRowActions`.

export interface PositionRowActionsContextValue {
  onEdit: (position: Position) => void;
  onDeactivate: (position: Position) => void;
  /** Ids con una baja en vuelo (`usePendingPositionIds`, calculado en la lista). */
  busyIds: number[];
}

const PositionRowActionsContext = createContext<PositionRowActionsContextValue | null>(null);

export const PositionRowActionsProvider = PositionRowActionsContext.Provider;

/** Para `PositionNameCell`: exige estar bajo un `PositionRowActionsProvider`. */
export function usePositionRowActionsContext(): PositionRowActionsContextValue {
  const value = useContext(PositionRowActionsContext);
  if (!value) {
    throw new Error(
      "PositionNameCell debe renderizarse dentro de un PositionRowActionsProvider (ver PositionList)."
    );
  }
  return value;
}

/**
 * Ids de puesto con una desactivación EN CURSO, leídos de la `MutationCache` y
 * no del `useMutation`, que solo recuerda su ÚLTIMA llamada. Una sola
 * suscripción, en `PositionList`; llega a cada menú por el contexto.
 */
export function usePendingPositionIds(): number[] {
  return useMutationState({
    filters: { status: "pending", mutationKey: deactivatePositionMutationKey },
    select: selectMutationRecordId,
  });
}
