"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Area } from "../interfaces/area.interface";
import { deactivateAreaMutationKey } from "./useDeleteArea";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`AreaNameCell`) por contexto, NO por la
// factoría de columnas: si el "en vuelo" viajara dentro de `getColumns(...)`,
// cada inicio y fin de una acción crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas. Mismo patrón que `useEmployeeRowActions`.

export interface AreaRowActionsContextValue {
  onEdit: (area: Area) => void;
  onDeactivate: (area: Area) => void;
  /** Ids con una baja en vuelo (`usePendingAreaIds`, calculado en la lista). */
  busyIds: number[];
}

const AreaRowActionsContext = createContext<AreaRowActionsContextValue | null>(null);

export const AreaRowActionsProvider = AreaRowActionsContext.Provider;

/** Para `AreaNameCell`: exige estar bajo un `AreaRowActionsProvider`. */
export function useAreaRowActionsContext(): AreaRowActionsContextValue {
  const value = useContext(AreaRowActionsContext);
  if (!value) {
    throw new Error("AreaNameCell debe renderizarse dentro de un AreaRowActionsProvider (ver AreaList).");
  }
  return value;
}

/**
 * Ids de área con una desactivación EN CURSO, leídos de la `MutationCache` y no
 * del `useMutation`, que solo recuerda su ÚLTIMA llamada. Una sola
 * suscripción, en `AreaList`; llega a cada menú por el contexto.
 */
export function usePendingAreaIds(): number[] {
  return useMutationState({
    filters: { status: "pending", mutationKey: deactivateAreaMutationKey },
    select: selectMutationRecordId,
  });
}
