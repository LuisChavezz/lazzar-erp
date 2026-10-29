"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Vacation } from "../interfaces/vacation.interface";
import { deleteVacationMutationKey } from "./useDeleteVacation";
import { approveVacationMutationKey } from "./useApproveVacation";
import { rejectVacationMutationKey } from "./useRejectVacation";

/**
 * Todos reciben la solicitud y el padre guarda solo su id: el diálogo se
 * resuelve contra el listado completo, porque aprobar o rechazar cambia
 * `estado` —justo un filtro— y la fila puede salir de la vista a mitad de la
 * interacción.
 */
export interface VacationRowActionsContextValue {
  onView: (vacation: Vacation) => void;
  onEdit: (vacation: Vacation) => void;
  onApprove: (vacation: Vacation) => void;
  onReject: (vacation: Vacation) => void;
  onDelete: (vacation: Vacation) => void;
  /** Ids con una acción en vuelo (`usePendingVacationIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<VacationRowActionsContextValue>(
  "VacationNameCell",
  "VacationList"
);

/** Callbacks y "en vuelo" del menú de fila (`VacationNameCell`); ver `createRowActionsContext`. */
export const VacationRowActionsProvider = Provider;
export const useVacationRowActionsContext = useRowActionsContext;

/**
 * Ids de solicitud con una acción EN CURSO (eliminar, aprobar o rechazar).
 * Mientras una está en vuelo, el menú de esa fila deshabilita TODAS sus
 * acciones: aprobar una solicitud que se está borrando no tiene sentido. Una
 * sola suscripción, en `VacationList`.
 */
export const usePendingVacationIds = () =>
  usePendingRecordIds(
    deleteVacationMutationKey,
    approveVacationMutationKey,
    rejectVacationMutationKey
  );
