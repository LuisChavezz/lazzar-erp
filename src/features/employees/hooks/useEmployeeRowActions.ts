"use client";

import { createRowActionsContext } from "@/src/hooks/createRowActionsContext";
import { usePendingRecordIds } from "@/src/hooks/usePendingRecordIds";
import type { Employee } from "../interfaces/employee.interface";
import { deactivateEmployeeMutationKey } from "./useDeleteEmployee";
import { reactivateEmployeeMutationKey } from "./useReactivateEmployee";

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

const { Provider, useRowActionsContext } = createRowActionsContext<EmployeeRowActionsContextValue>(
  "EmployeeNameCell",
  "EmployeeList"
);

/** Callbacks y "en vuelo" del menú de fila (`EmployeeNameCell`); ver `createRowActionsContext`. */
export const EmployeeRowActionsProvider = Provider;
export const useEmployeeRowActionsContext = useRowActionsContext;

/**
 * Ids de empleado con una desactivación o reactivación en curso. Una sola
 * suscripción, en `EmployeeList`.
 */
export const usePendingEmployeeIds = () =>
  usePendingRecordIds(deactivateEmployeeMutationKey, reactivateEmployeeMutationKey);
