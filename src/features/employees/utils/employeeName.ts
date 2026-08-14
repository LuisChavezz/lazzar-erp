import type { Employee } from "../interfaces/employee.interface";

/**
 * Nombre completo del empleado. `apellido_materno` es opcional y llega como
 * cadena vacía (no null), así que se filtra para no dejar un espacio doble.
 */
export const getEmployeeFullName = (
  employee: Pick<Employee, "nombre" | "apellido_paterno" | "apellido_materno">
): string =>
  [employee.nombre, employee.apellido_paterno, employee.apellido_materno]
    .filter((part) => part && part.trim())
    .join(" ");
