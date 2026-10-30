"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Training } from "../interfaces/training.interface";
import { deleteTrainingMutationKey } from "./useDeleteTraining";

/**
 * Todos reciben la capacitación y el padre guarda solo su id: el diálogo se
 * resuelve contra el listado completo, así sobrevive a que la fila salga de la
 * vista filtrada (el optimista del borrado la saca del listado al confirmar).
 */
export interface TrainingRowActionsContextValue {
  onEdit: (training: Training) => void;
  onDelete: (training: Training) => void;
  /** Ids con un borrado en vuelo (`usePendingTrainingIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<TrainingRowActionsContextValue>(
  "TrainingNameCell",
  "TrainingList"
);

/** Callbacks y "en vuelo" del menú de fila (`TrainingNameCell`); ver `createRowActionsContext`. */
export const TrainingRowActionsProvider = Provider;
export const useTrainingRowActionsContext = useRowActionsContext;

/** Ids de capacitación con un borrado en curso. Una sola suscripción, en `TrainingList`. */
export const usePendingTrainingIds = () => usePendingRecordIds(deleteTrainingMutationKey);
