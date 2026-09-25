"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import type { Training } from "../interfaces/training.interface";
import { deleteTrainingMutationKey } from "./useDeleteTraining";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`TrainingRowActionsMenu`) por contexto, NO por
// la factoría de columnas: si el id "en borrado" viajara dentro de
// `getColumns(...)`, cada inicio y fin de un borrado crearía funciones `cell`
// nuevas y React remontaría TODAS las celdas (se cierra el menú abierto de otra
// fila, caducan las refs). Con contexto las columnas solo dependen de los
// permisos y solo re-renderiza el menú que lo consume. Mismo patrón que
// `useQuoteRowActions`.

export interface TrainingRowActionsContextValue {
  onEdit: (training: Training) => void;
  onDelete: (training: Training) => void;
}

const TrainingRowActionsContext = createContext<TrainingRowActionsContextValue | null>(null);

export const TrainingRowActionsProvider = TrainingRowActionsContext.Provider;

/** Para `TrainingRowActionsMenu`: exige estar bajo un `TrainingRowActionsProvider`. */
export function useTrainingRowActionsContext(): TrainingRowActionsContextValue {
  const value = useContext(TrainingRowActionsContext);
  if (!value) {
    throw new Error(
      "TrainingRowActionsMenu debe renderizarse dentro de un TrainingRowActionsProvider (ver TrainingList)."
    );
  }
  return value;
}

/**
 * Ids de capacitación con un borrado EN CURSO, leídos de la `MutationCache` y
 * no de la instancia de `useMutation`: una instancia solo recuerda su ÚLTIMA
 * llamada, así que borrar #2 y luego #1 dejaría a #2 sin su estado "en curso"
 * aunque siga en vuelo. Mismo criterio que `usePendingQuoteIds`.
 */
export function usePendingTrainingDeleteIds(): number[] {
  return useMutationState({
    filters: { mutationKey: [...deleteTrainingMutationKey], status: "pending" },
    select: (mutation) => mutation.state.variables as number,
  });
}
