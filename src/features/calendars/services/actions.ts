import { v1_api } from "@/src/api/v1.api";
import type { Calendar, CalendarCreate } from "../interfaces/calendar.interface";

export const getCalendars = async (): Promise<Calendar[]> => {
  const { data } = await v1_api.get<Calendar[]>("/hr/calendarios/");
  return data;
};

export const createCalendar = async (calendar: CalendarCreate): Promise<Calendar> => {
  const { data } = await v1_api.post<Calendar>("/hr/calendarios/", calendar);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT. Con PUT, todo campo ausente del cuerpo se
 * reemplaza; con PATCH solo se actualiza lo que se envía. Mismo criterio que en
 * empleados, áreas, puestos y turnos.
 */
export const updateCalendar = async (
  id: number,
  calendar: CalendarCreate
): Promise<Calendar> => {
  const { data } = await v1_api.patch<Calendar>(`/hr/calendarios/${id}/`, calendar);
  return data;
};

/**
 * Borrado REAL, no baja lógica: `Calendario` no tiene `activo` y la fila
 * desaparece de la base. De ahí que el optimista filtre en vez de marcar.
 */
export const deleteCalendar = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/calendarios/${id}/`);
};
