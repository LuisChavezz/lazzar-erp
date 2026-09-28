import { v1_api } from "@/src/api/v1.api";
import type {
  Vacation,
  VacationRejectBody,
  VacationWrite,
} from "../interfaces/vacation.interface";

/**
 * Arreglo plano, sin paginación, ordenado por `-fecha_solicitud`. El detalle
 * tiene la misma forma. Los filtros de fecha del servidor son de CONTENCIÓN
 * (`fecha_inicio__gte`, `fecha_fin__lte`), no de traslape: la regla de traslape
 * se evalúa en cliente contra este listado completo.
 */
export const getVacations = async (): Promise<Vacation[]> => {
  const { data } = await v1_api.get<Vacation[]>("/hr/vacaciones/");
  return data;
};

/**
 * Una solicitud leída del SERVIDOR, sin pasar por la caché de TanStack. La
 * usan las guardas previas al PATCH y al DELETE (`verifyVacationEstado`): el
 * backend no protege `estado` en esas escrituras.
 */
export const getVacation = async (id: number): Promise<Vacation> => {
  const { data } = await v1_api.get<Vacation>(`/hr/vacaciones/${id}/`);
  return data;
};

/**
 * Las solicitudes de UN empleado, frescas del servidor (filtro exacto
 * `empleado` del `filterset_fields` del backend). Sin caché: la usa la guarda
 * previa al alta y a la edición para evaluar el traslape contra datos vigentes.
 */
export const getVacationsByEmployee = async (empleado: number): Promise<Vacation[]> => {
  const { data } = await v1_api.get<Vacation[]>("/hr/vacaciones/", { params: { empleado } });
  return data;
};

export const createVacation = async (vacation: VacationWrite): Promise<Vacation> => {
  const { data } = await v1_api.post<Vacation>("/hr/vacaciones/", vacation);
  return data;
};

/**
 * Edición parcial: PATCH, nunca PUT. Solo se ofrece sobre solicitudes
 * pendientes. Mismo criterio que en el resto de catálogos de RH.
 */
export const updateVacation = async (id: number, vacation: VacationWrite): Promise<Vacation> => {
  const { data } = await v1_api.patch<Vacation>(`/hr/vacaciones/${id}/`, vacation);
  return data;
};

/**
 * Borrado FÍSICO en cualquier estado: el modelo no tiene `activo` ni
 * `soft_delete`, así que el `SoftDeleteDestroyMixin` del backend cae al
 * `delete()` real. Sobre una aprobada es la única forma de anularla.
 */
export const deleteVacation = async (id: number): Promise<void> => {
  await v1_api.delete(`/hr/vacaciones/${id}/`);
};

/**
 * `POST /hr/vacaciones/{id}/aprobar/`, sin cuerpo. Devuelve el registro
 * completo con `autorizado_por` y `fecha_aprobacion` ya fijados. 400
 * `{"detail": ...}` si ya no está pendiente.
 */
export const approveVacation = async (id: number): Promise<Vacation> => {
  const { data } = await v1_api.post<Vacation>(`/hr/vacaciones/${id}/aprobar/`);
  return data;
};

/**
 * `POST /hr/vacaciones/{id}/rechazar/`. El backend NO exige el motivo (usa
 * `""` si falta); el cliente sí lo exige. 400 `{"detail": ...}` si ya no está
 * pendiente.
 */
export const rejectVacation = async (id: number, body: VacationRejectBody): Promise<Vacation> => {
  const { data } = await v1_api.post<Vacation>(`/hr/vacaciones/${id}/rechazar/`, body);
  return data;
};
