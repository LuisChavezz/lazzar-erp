import type { Employee } from "@/src/features/employees/interfaces/employee.interface";
import { getEmployeeFullName } from "@/src/features/employees/utils/employeeName";

export interface EmployeeOption {
  id: number;
  label: string;
  activo: boolean;
}

type EmployeeLike = Pick<
  Employee,
  "id" | "sucursal" | "activo" | "nombre" | "apellido_paterno" | "apellido_materno"
>;

/**
 * Opciones de empleado para un selector o un filtro: activos E inactivos,
 * estos últimos con "(inactivo)", ordenados por nombre.
 *
 * Con `sucursalIds` solo entran los empleados de esas sucursales (las del
 * usuario, de `/nucleo/mis-sucursales/`); sin él, todos.
 */
export const buildEmployeeOptions = (
  employees: readonly EmployeeLike[],
  sucursalIds?: ReadonlySet<number>
): EmployeeOption[] =>
  employees
    .filter((employee) => !sucursalIds || sucursalIds.has(employee.sucursal))
    .map((employee) => ({
      id: employee.id,
      label: employee.activo
        ? getEmployeeFullName(employee)
        : `${getEmployeeFullName(employee)} (inactivo)`,
      activo: employee.activo,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es-MX"));
