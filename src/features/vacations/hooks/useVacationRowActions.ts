"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Vacation } from "../interfaces/vacation.interface";
import { deleteVacationMutationKey } from "./useDeleteVacation";
import { approveVacationMutationKey } from "./useApproveVacation";
import { rejectVacationMutationKey } from "./useRejectVacation";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`VacationRowActionsMenu`) por contexto, NO por la
// factoría de columnas: si el "en vuelo" viajara dentro de `getColumns(...)`,
// cada inicio y fin de una acción crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas. Mismo patrón que `useEvaluationRowActions`.
//
// Todos reciben la solicitud y el padre guarda solo su id: el diálogo se resuelve
// contra el listado completo, porque aprobar o rechazar cambia `estado` —justo
// un filtro— y la fila puede salir de la vista a mitad de la interacción.

export interface VacationRowActionsContextValue {
  onView: (vacation: Vacation) => void;
  onEdit: (vacation: Vacation) => void;
  onApprove: (vacation: Vacation) => void;
  onReject: (vacation: Vacation) => void;
  onDelete: (vacation: Vacation) => void;
  /** Ids con una acción en vuelo (`usePendingVacationIds`, calculado en la lista). */
  busyIds: number[];
}

const VacationRowActionsContext = createContext<VacationRowActionsContextValue | null>(null);

export const VacationRowActionsProvider = VacationRowActionsContext.Provider;

/** Para `VacationRowActionsMenu`: exige estar bajo un `VacationRowActionsProvider`. */
export function useVacationRowActionsContext(): VacationRowActionsContextValue {
  const value = useContext(VacationRowActionsContext);
  if (!value) {
    throw new Error(
      "VacationRowActionsMenu debe renderizarse dentro de un VacationRowActionsProvider (ver VacationList)."
    );
  }
  return value;
}

/** Primer segmento de la clave de cada mutación de fila. */
const ROW_MUTATION_KEYS = new Set<unknown>([
  deleteVacationMutationKey[0],
  approveVacationMutationKey[0],
  rejectVacationMutationKey[0],
]);

/**
 * Ids de solicitud con una acción EN CURSO (eliminar, aprobar o rechazar),
 * leídos de la `MutationCache` y no de cada `useMutation`, que solo recuerda su
 * ÚLTIMA llamada. Mientras una está en vuelo, el menú de esa fila deshabilita
 * TODAS sus acciones: aprobar una solicitud que se está borrando no tiene
 * sentido.
 *
 * UNA sola suscripción (un `predicate` para las tres claves), llamada UNA vez
 * en `VacationList`: el resultado llega a cada menú por el contexto
 * (`busyIds`), no con una suscripción por fila.
 */
export function usePendingVacationIds(): number[] {
  return useMutationState({
    filters: {
      status: "pending",
      predicate: (mutation) => ROW_MUTATION_KEYS.has(mutation.options.mutationKey?.[0]),
    },
    select: selectMutationRecordId,
  });
}
