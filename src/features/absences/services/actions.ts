import { v1_api } from "@/src/api/v1.api";
import type { Absence, AbsenceRejectBody, AbsenceWrite } from "../interfaces/absence.interface";

const BASE = "/hr/permisos-ausencias/";

/**
 * Arreglo plano, sin paginación, ordenado por `-fecha_solicitud`. Los filtros
 * de fecha del servidor son de CONTENCIÓN, no de traslape: la regla de
 * traslape se evalúa en cliente.
 */
export const getAbsences = async (): Promise<Absence[]> => {
  const { data } = await v1_api.get<Absence[]>(BASE);
  return data;
};

/** Un registro leído del SERVIDOR, sin caché (guarda previa a escribir). */
export const getAbsence = async (id: number): Promise<Absence> => {
  const { data } = await v1_api.get<Absence>(`${BASE}${id}/`);
  return data;
};

/**
 * Los registros de UN empleado, frescos del servidor (filtro exacto
 * `empleado`). Sin caché: lo usan las guardas de traslape previas al alta y a
 * la edición, de ausencias Y de vacaciones.
 */
export const getAbsencesByEmployee = async (empleado: number): Promise<Absence[]> => {
  const { data } = await v1_api.get<Absence[]>(BASE, { params: { empleado } });
  return data;
};

export const createAbsence = async (absence: AbsenceWrite): Promise<Absence> => {
  const { data } = await v1_api.post<Absence>(BASE, absence);
  return data;
};

/** Edición parcial: PATCH, nunca PUT. Solo sobre registros pendientes. */
export const updateAbsence = async (id: number, absence: AbsenceWrite): Promise<Absence> => {
  const { data } = await v1_api.patch<Absence>(`${BASE}${id}/`, absence);
  return data;
};

/**
 * Borrado FÍSICO en cualquier estado: el modelo no tiene `activo` ni
 * `soft_delete`. Sobre uno aprobado es la única forma de anularlo.
 */
export const deleteAbsence = async (id: number): Promise<void> => {
  await v1_api.delete(`${BASE}${id}/`);
};

/** `POST {id}/aprobar/`, sin cuerpo. 400 `{"detail"}` si ya no está pendiente. */
export const approveAbsence = async (id: number): Promise<Absence> => {
  const { data } = await v1_api.post<Absence>(`${BASE}${id}/aprobar/`);
  return data;
};

/**
 * `POST {id}/rechazar/`. El backend no exige el motivo; el cliente sí. 400
 * `{"detail"}` si ya no está pendiente.
 */
export const rejectAbsence = async (id: number, body: AbsenceRejectBody): Promise<Absence> => {
  const { data } = await v1_api.post<Absence>(`${BASE}${id}/rechazar/`, body);
  return data;
};
