import { v1_api } from "@/src/api/v1.api";
import type { Shift, ShiftPayload } from "../interfaces/shift.interface";

export const getShifts = async (): Promise<Shift[]> => {
  const { data } = await v1_api.get<Shift[]>("/hr/turnos/");
  return data;
};

export const createShift = async (shift: ShiftPayload): Promise<Shift> => {
  const { data } = await v1_api.post<Shift>("/hr/turnos/", shift);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT. Con PUT, todo campo ausente del cuerpo se
 * reemplaza; con PATCH solo se actualiza lo que se envía. Mismo criterio que
 * en empleados, áreas y puestos.
 */
export const updateShift = async (id: number, shift: ShiftPayload): Promise<Shift> => {
  const { data } = await v1_api.patch<Shift>(`/hr/turnos/${id}/`, shift);
  return data;
};

/** Baja lógica: el backend pone `activo` en false, no borra el registro. */
export const deleteShift = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/turnos/${id}/`);
};
