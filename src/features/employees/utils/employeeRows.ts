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

/** Aviso de un diálogo de fila que se cerró por un cambio externo. */
export interface StaleEmployeeDialogNotice {
  /** `id` del toast: estable, para que un doble render no lo duplique. */
  key: string;
  message: string;
}

/**
 * ¿El diálogo de fila (desactivar o reactivar) de `targetId` ya no aplica?
 * Lo decide la vía rápida contra la caché de `EmployeeList`: si el empleado ya
 * no está o su `activo` ya no es el que la acción necesita (`expectedActivo`:
 * `true` para desactivar, `false` para reactivar), el diálogo se cierra con el
 * aviso que devuelve. Mientras la acción PROPIA está en vuelo (`isBusy`) no
 * aplica: el optimista invierte `activo` al arrancar y el diálogo lo cierra el
 * `onSettled` de la mutación, sin aviso. `null` = el diálogo sigue.
 */
export const getStaleEmployeeDialogNotice = ({
  targetId,
  target,
  expectedActivo,
  isBusy,
}: {
  targetId: number | null;
  target: Pick<EmployeeRow, "activo"> | null;
  expectedActivo: boolean;
  isBusy: boolean;
}): StaleEmployeeDialogNotice | null => {
  if (targetId === null || isBusy) return null;
  if (target === null) {
    return { key: `employee-stale-${targetId}-gone`, message: EMPLOYEE_GONE_MESSAGE };
  }
  if (target.activo === expectedActivo) return null;
  return {
    key: `employee-stale-${targetId}-${String(target.activo)}`,
    message: employeeActivoChangedMessage(target.activo),
  };
};
