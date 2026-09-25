import { v1_api } from "@/src/api/v1.api";
import type { Incident, IncidentCreate } from "../interfaces/incident.interface";

/**
 * Arreglo plano, sin paginación, con los dados de baja INCLUIDOS: la tabla los
 * muestra con estatus Inactivo. El detalle tiene la misma forma.
 */
export const getIncidents = async (): Promise<Incident[]> => {
  const { data } = await v1_api.get<Incident[]>("/hr/incidencias/");
  return data;
};

export const createIncident = async (incident: IncidentCreate): Promise<Incident> => {
  const { data } = await v1_api.post<Incident>("/hr/incidencias/", incident);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT. Con PUT, todo campo ausente del cuerpo se
 * reemplaza; con PATCH solo se actualiza lo que se envía. Mismo criterio que en
 * el resto de catálogos de RH.
 */
export const updateIncident = async (
  id: number,
  incident: IncidentCreate
): Promise<Incident> => {
  const { data } = await v1_api.patch<Incident>(`/hr/incidencias/${id}/`, incident);
  return data;
};

/**
 * Baja lógica y reactivación en un solo PATCH de `activo`. Ocupa el lugar del
 * DELETE, que el backend implementa como esta misma baja lógica: la pantalla no
 * lo usa, así el mismo endpoint cubre las dos direcciones. Mismo criterio que
 * `setCostCenterActivo`.
 */
export const setIncidentActivo = async (id: number, activo: boolean): Promise<Incident> => {
  const { data } = await v1_api.patch<Incident>(`/hr/incidencias/${id}/`, { activo });
  return data;
};
