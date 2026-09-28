"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Absence } from "../interfaces/absence.interface";
import { deleteAbsenceMutationKey } from "./useDeleteAbsence";
import { approveAbsenceMutationKey } from "./useApproveAbsence";
import { rejectAbsenceMutationKey } from "./useRejectAbsence";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Callbacks y "en vuelo" llegan al menú por contexto, NO por la factoría de
// columnas (cambiarlos remontaría todas las celdas). El padre guarda solo ids:
// aprobar o rechazar cambia `estado` —un filtro— y la fila puede salir de la
// vista a mitad de la interacción. Mismo patrón que `useVacationRowActions`.

export interface AbsenceRowActionsContextValue {
  onView: (absence: Absence) => void;
  onEdit: (absence: Absence) => void;
  onApprove: (absence: Absence) => void;
  onReject: (absence: Absence) => void;
  onDelete: (absence: Absence) => void;
  /** Ids con una acción en vuelo (`usePendingAbsenceIds`, calculado en la lista). */
  busyIds: number[];
}

const AbsenceRowActionsContext = createContext<AbsenceRowActionsContextValue | null>(null);

export const AbsenceRowActionsProvider = AbsenceRowActionsContext.Provider;

export function useAbsenceRowActionsContext(): AbsenceRowActionsContextValue {
  const value = useContext(AbsenceRowActionsContext);
  if (!value) {
    throw new Error(
      "AbsenceRowActionsMenu debe renderizarse dentro de un AbsenceRowActionsProvider (ver AbsenceList)."
    );
  }
  return value;
}


const ROW_MUTATION_KEYS = new Set<unknown>([
  deleteAbsenceMutationKey[0],
  approveAbsenceMutationKey[0],
  rejectAbsenceMutationKey[0],
]);

/**
 * Ids con una acción EN CURSO (eliminar, aprobar/confirmar, rechazar/
 * descartar), de la `MutationCache`. UNA suscripción, llamada una vez en
 * `AbsenceList`; llega a cada menú por el contexto.
 */
export function usePendingAbsenceIds(): number[] {
  return useMutationState({
    filters: {
      status: "pending",
      predicate: (mutation) => ROW_MUTATION_KEYS.has(mutation.options.mutationKey?.[0]),
    },
    select: selectMutationRecordId,
  });
}
