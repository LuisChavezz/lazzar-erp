"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Absence } from "../interfaces/absence.interface";
import { deleteAbsenceMutationKey } from "./useDeleteAbsence";
import { approveAbsenceMutationKey } from "./useApproveAbsence";
import { rejectAbsenceMutationKey } from "./useRejectAbsence";

/**
 * El padre guarda solo ids: aprobar o rechazar cambia `estado` —un filtro— y
 * la fila puede salir de la vista a mitad de la interacción. Mismo patrón que
 * `useVacationRowActions`.
 */
export interface AbsenceRowActionsContextValue {
  onView: (absence: Absence) => void;
  onEdit: (absence: Absence) => void;
  onApprove: (absence: Absence) => void;
  onReject: (absence: Absence) => void;
  onDelete: (absence: Absence) => void;
  /** Ids con una acción en vuelo (`usePendingAbsenceIds`, calculado en la lista). */
  busyIds: number[];
}

const { Provider, useRowActionsContext } = createRowActionsContext<AbsenceRowActionsContextValue>(
  "AbsenceNameCell",
  "AbsenceList"
);

/** Callbacks y "en vuelo" del menú de fila (`AbsenceNameCell`); ver `createRowActionsContext`. */
export const AbsenceRowActionsProvider = Provider;
export const useAbsenceRowActionsContext = useRowActionsContext;

/**
 * Ids con una acción EN CURSO (eliminar, aprobar/confirmar, rechazar/
 * descartar). Una sola suscripción, en `AbsenceList`.
 */
export const usePendingAbsenceIds = () =>
  usePendingRecordIds(deleteAbsenceMutationKey, approveAbsenceMutationKey, rejectAbsenceMutationKey);
