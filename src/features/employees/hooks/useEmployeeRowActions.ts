"use client";

import { createContext, useContext } from "react";
import { useMutationState } from "@tanstack/react-query";
import { selectMutationRecordId } from "@/src/utils/mutationRecordId";
import type { Employee } from "../interfaces/employee.interface";
import { deactivateEmployeeMutationKey } from "./useDeleteEmployee";
import { reactivateEmployeeMutationKey } from "./useReactivateEmployee";

// ─── Contexto para el menú de fila ────────────────────────────────────────────
// Los callbacks llegan al menú (`EmployeeNameCell`) por contexto, NO por la
// factoría de columnas: si el "en vuelo" viajara dentro de `getColumns(...)`,
// cada inicio y fin de una acción crearía funciones `cell` nuevas y React
// remontaría TODAS las celdas. Mismo patrón que `useVacationRowActions`.
//
// Desactivar y reactivar reciben el empleado y la lista guarda solo su id: el
// diálogo se resuelve contra el listado completo, porque el cambio de `activo`
// —justo un filtro— puede sacar la fila de la vista a mitad de la interacción.

export interface EmployeeRowActionsContextValue {
  /** Siembra la caché del detalle antes de que el enlace navegue. */
  onView: (employee: Employee) => void;
  onEdit: (employee: Employee) => void;
  onDeactivate: (employee: Employee) => void;
  onReactivate: (employee: Employee) => void;
  /** Ids con una acción en vuelo (`usePendingEmployeeIds`, calculado en la lista). */
  busyIds: number[];
}

const EmployeeRowActionsContext = createContext<EmployeeRowActionsContextValue | null>(null);

export const EmployeeRowActionsProvider = EmployeeRowActionsContext.Provider;

/** Para `EmployeeNameCell`: exige estar bajo un `EmployeeRowActionsProvider`. */
export function useEmployeeRowActionsContext(): EmployeeRowActionsContextValue {
  const value = useContext(EmployeeRowActionsContext);
  if (!value) {
    throw new Error(
      "EmployeeNameCell debe renderizarse dentro de un EmployeeRowActionsProvider (ver EmployeeList)."
    );
  }
  return value;
}

/** Primer segmento de la clave de cada mutación de fila. */
const ROW_MUTATION_KEYS = new Set<unknown>([
  deactivateEmployeeMutationKey[0],
  reactivateEmployeeMutationKey[0],
]);

/**
 * Ids de empleado con una desactivación o reactivación EN CURSO, leídos de la
 * `MutationCache` y no de cada `useMutation`, que solo recuerda su ÚLTIMA
 * llamada. UNA sola suscripción, en `EmployeeList`; llega a cada menú por el
 * contexto.
 */
export function usePendingEmployeeIds(): number[] {
  return useMutationState({
    filters: {
      status: "pending",
      predicate: (mutation) => ROW_MUTATION_KEYS.has(mutation.options.mutationKey?.[0]),
    },
    select: selectMutationRecordId,
  });
}
