import { v1_api } from "@/src/api/v1.api";
import type { Employee, EmployeePayload } from "../interfaces/employee.interface";

export const getEmployees = async (): Promise<Employee[]> => {
  const { data } = await v1_api.get<Employee[]>("/hr/empleados/");
  return data;
};

export const getEmployee = async (id: number): Promise<Employee> => {
  const { data } = await v1_api.get<Employee>(`/hr/empleados/${id}/`);
  return data;
};

export const createEmployee = async (employee: EmployeePayload): Promise<Employee> => {
  const { data } = await v1_api.post<Employee>("/hr/empleados/", employee);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT.
 *
 * El modelo `Empleado` del backend tiene bastantes más campos de los que este
 * frontend administra (domicilio, datos bancarios, contacto de emergencia,
 * turno...). Con PUT, todo campo ausente del cuerpo se reemplaza — y como esos
 * campos son opcionales, se vaciarían en silencio en cada edición. Con PATCH
 * solo se actualiza lo que se envía y el resto queda intacto.
 */
export const updateEmployee = async (
  id: number,
  employee: EmployeePayload
): Promise<Employee> => {
  const { data } = await v1_api.patch<Employee>(`/hr/empleados/${id}/`, employee);
  return data;
};

/**
 * Reactiva un empleado dado de baja.
 *
 * El cuerpo lleva SOLO `activo`. El modelo del backend limpia `fecha_baja` por
 * su cuenta en la transición inactivo → activo, así que mandarla desde aquí
 * duplicaría esa regla y abriría la puerta a que las dos versiones discrepen.
 */
export const reactivateEmployee = async (id: number): Promise<Employee> => {
  const { data } = await v1_api.patch<Employee>(`/hr/empleados/${id}/`, { activo: true });
  return data;
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/empleados/${id}/`);
};
