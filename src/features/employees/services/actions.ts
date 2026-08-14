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

export const updateEmployee = async (
  id: number,
  employee: EmployeePayload
): Promise<Employee> => {
  const { data } = await v1_api.put<Employee>(`/hr/empleados/${id}/`, employee);
  return data;
};

export const deleteEmployee = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/empleados/${id}/`);
};
