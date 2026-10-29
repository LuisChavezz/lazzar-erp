import {
  getStaleRowDialogNotice,
  type StaleRowDialogMessages,
  type StaleRowDialogNotice,
} from "@/src/utils/staleRowDialogNotice";
import type { Employee } from "../interfaces/employee.interface";
import type { EmployeeRow } from "../components/EmployeeColumns";
import { EMPLOYEE_GONE_MESSAGE, employeeActivoChangedMessage } from "../hooks/employeeStaleMessages";

/** Nombres de los catálogos con que se resuelven los FK de la fila. */
export interface EmployeeRowCatalogs {
  positionNameById: ReadonlyMap<number, string>;
  departmentNameById: ReadonlyMap<number, string>;
  branchNameById: ReadonlyMap<number, string>;
}

/**
 * Filas de la tabla: cada empleado con sus nombres de puesto, departamento y
 * sucursal resueltos. Un FK que no está en su catálogo (o cuyo catálogo no ha
 * llegado) se rotula `Puesto #N` / `Departamento #N` / `Sucursal #N`, una sola
 * vez: la celda y el filtro de encabezado leen ese mismo texto (ver
 * `EmployeeRow`).
 */
export const buildEmployeeRows = (
  employees: readonly Employee[],
  { positionNameById, departmentNameById, branchNameById }: EmployeeRowCatalogs,
): EmployeeRow[] =>
  employees.map((employee) => ({
    ...employee,
    puesto_nombre: positionNameById.get(employee.puesto) ?? `Puesto #${employee.puesto}`,
    departamento_nombre:
      departmentNameById.get(employee.departamento) ?? `Departamento #${employee.departamento}`,
    sucursal_nombre: branchNameById.get(employee.sucursal) ?? `Sucursal #${employee.sucursal}`,
  }));

/** Textos del aviso de un diálogo de fila de empleado que se cerró por un cambio externo. */
const EMPLOYEE_STALE_MESSAGES: Required<StaleRowDialogMessages> = {
  gone: EMPLOYEE_GONE_MESSAGE,
  activoChanged: employeeActivoChangedMessage,
};

/**
 * ¿El diálogo de fila (desactivar o reactivar) de `targetId` ya no aplica?
 * `expectedActivo`: `true` para desactivar, `false` para reactivar. La regla es
 * la genérica de los catálogos (`getStaleRowDialogNotice`) con los textos de
 * empleado. `null` = el diálogo sigue.
 */
export const getStaleEmployeeDialogNotice = (args: {
  targetId: number | null;
  target: Pick<EmployeeRow, "activo"> | null;
  expectedActivo: boolean;
  isBusy: boolean;
}): StaleRowDialogNotice | null =>
  getStaleRowDialogNotice({ resource: "employee", messages: EMPLOYEE_STALE_MESSAGES, ...args });
