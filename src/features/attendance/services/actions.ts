import { v1_api } from "@/src/api/v1.api";
import type {
  Attendance,
  AttendanceCheckInBody,
  AttendanceCorrectionBody,
  AttendanceCreateBody,
  AttendanceJustificationBody,
  AttendanceListParams,
} from "../interfaces/attendance.interface";

const BASE = "/hr/asistencias/";

/**
 * Arreglo plano, SIN paginación, ordenado por `-fecha`. Como hay un registro
 * por empleado y día, el listado crece sin tope: la pantalla siempre acota por
 * fecha en el servidor (`fecha`, o `fecha__gte` + `fecha__lte`).
 */
export const getAttendance = async (params: AttendanceListParams): Promise<Attendance[]> => {
  const { data } = await v1_api.get<Attendance[]>(BASE, { params });
  return data;
};

/**
 * Alta manual. El módulo solo la usa para "Marcar falta" (sin horas); nunca
 * envía `estado`, los campos calculados ni `autorizado_por`. Un duplicado de
 * `(empleado, fecha)` responde 400 `{"non_field_errors": [...]}`.
 */
export const createAttendance = async (body: AttendanceCreateBody): Promise<Attendance> => {
  const { data } = await v1_api.post<Attendance>(BASE, body);
  return data;
};

/** Corrección de horas y observaciones: PATCH parcial, nunca PUT, nunca `estado`. */
export const correctAttendance = async (
  id: number,
  body: AttendanceCorrectionBody
): Promise<Attendance> => {
  const { data } = await v1_api.patch<Attendance>(`${BASE}${id}/`, body);
  return data;
};

/** Justificar o quitar la justificación: PATCH con `estado` como único campo. */
export const setAttendanceJustification = async (
  id: number,
  body: AttendanceJustificationBody
): Promise<Attendance> => {
  const { data } = await v1_api.patch<Attendance>(`${BASE}${id}/`, body);
  return data;
};

/**
 * Borrado FÍSICO: el modelo no tiene `activo` ni `soft_delete`, así que el
 * `SoftDeleteDestroyMixin` del backend cae al `delete()` real. Responde 409
 * `{"detail": ...}` si un `ControlHoras` depende del registro.
 */
export const deleteAttendance = async (id: number): Promise<void> => {
  await v1_api.delete(`${BASE}${id}/`);
};

/**
 * `POST registrar_entrada/`. 200 con el registro (también cuando lo crea).
 * 400 `{"detail"}` (fecha que no coincide, empleado sin turno, entrada no
 * anterior a una salida guardada) o `{"empleado_id": [...]}`; 404 si el
 * empleado no existe; 409 si la entrada ya está registrada.
 */
export const registerEntry = async (body: AttendanceCheckInBody): Promise<Attendance> => {
  const { data } = await v1_api.post<Attendance>(`${BASE}registrar_entrada/`, body);
  return data;
};

/**
 * `POST registrar_salida/`. 200 con el registro. 400 `{"detail"}` (sin
 * entrada, salida no posterior a la entrada, fecha que no coincide); 404 si no
 * hay registro ese día o el empleado no existe; 409 si la salida ya está
 * registrada.
 */
export const registerExit = async (body: AttendanceCheckInBody): Promise<Attendance> => {
  const { data } = await v1_api.post<Attendance>(`${BASE}registrar_salida/`, body);
  return data;
};
