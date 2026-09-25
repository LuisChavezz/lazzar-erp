"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import type { Evaluation } from "../interfaces/evaluation.interface";
import { deleteEvaluationMutationKey } from "./useDeleteEvaluation";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`EvaluationRowActionsMenu`) por contexto, NO por
// la factoría de columnas: si el id "en borrado" viajara dentro de
// `getColumns(...)`, cada inicio y fin de un borrado crearía funciones `cell`
// nuevas y React remontaría TODAS las celdas (se cierra el menú abierto de otra
// fila, caducan las refs). Mismo patrón que `useIncidentRowActions`.

export interface EvaluationRowActionsContextValue {
  onEdit: (evaluation: Evaluation) => void;
  onDelete: (evaluation: Evaluation) => void;
}

const EvaluationRowActionsContext = createContext<EvaluationRowActionsContextValue | null>(null);

export const EvaluationRowActionsProvider = EvaluationRowActionsContext.Provider;

/** Para `EvaluationRowActionsMenu`: exige estar bajo un `EvaluationRowActionsProvider`. */
export function useEvaluationRowActionsContext(): EvaluationRowActionsContextValue {
  const value = useContext(EvaluationRowActionsContext);
  if (!value) {
    throw new Error(
      "EvaluationRowActionsMenu debe renderizarse dentro de un EvaluationRowActionsProvider (ver EvaluationList)."
    );
  }
  return value;
}

/**
 * Ids de evaluación con un borrado EN CURSO, leídos de la `MutationCache` y no
 * de la instancia de `useMutation`, que solo recuerda su ÚLTIMA llamada. Mismo
 * criterio que `usePendingTrainingDeleteIds`.
 */
export function usePendingEvaluationDeleteIds(): number[] {
  return useMutationState({
    filters: { mutationKey: [...deleteEvaluationMutationKey], status: "pending" },
    select: (mutation) => mutation.state.variables as number,
  });
}
