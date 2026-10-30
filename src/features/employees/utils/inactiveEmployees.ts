import type { Employee } from "../interfaces/employee.interface";

/**
 * `(id) => ¿el empleado está dado de baja?`, resuelto contra el catálogo de
 * empleados que la página ya cargó (que incluye a los inactivos). Lo recibe
 * `employeeHeaderFilter` para marcar " (inactivo)" en sus opciones. Un id que
 * el catálogo no trae (o un catálogo que no ha llegado) no se marca.
 */
export const getInactiveEmployeeLookup = (
  employees: readonly Pick<Employee, "id" | "activo">[],
): ((empleado: number) => boolean) => {
  const inactiveIds = new Set(employees.filter((employee) => !employee.activo).map((employee) => employee.id));
  return (empleado) => inactiveIds.has(empleado);
};
