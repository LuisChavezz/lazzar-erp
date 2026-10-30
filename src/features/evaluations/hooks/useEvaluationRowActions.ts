"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Evaluation } from "../interfaces/evaluation.interface";
import { deleteEvaluationMutationKey } from "./useDeleteEvaluation";

/**
 * Todos reciben la evaluación y el padre guarda solo su id: el diálogo se
 * resuelve contra el listado completo, así sobrevive a que la fila salga de la
 * vista filtrada (completarla cambia `estado`, que es un filtro).
 */
export interface EvaluationRowActionsContextValue {
  onEdit: (evaluation: Evaluation) => void;
  onDelete: (evaluation: Evaluation) => void;
  /** Ids con un borrado en vuelo (`usePendingEvaluationIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<EvaluationRowActionsContextValue>(
  "EvaluationNameCell",
  "EvaluationList"
);

/** Callbacks y "en vuelo" del menú de fila (`EvaluationNameCell`); ver `createRowActionsContext`. */
export const EvaluationRowActionsProvider = Provider;
export const useEvaluationRowActionsContext = useRowActionsContext;

/** Ids de evaluación con un borrado en curso. Una sola suscripción, en `EvaluationList`. */
export const usePendingEvaluationIds = () => usePendingRecordIds(deleteEvaluationMutationKey);
