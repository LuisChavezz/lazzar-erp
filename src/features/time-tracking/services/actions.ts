import { v1_api } from "@/src/api/v1.api";
import type {
  TimeSegment,
  TimeSegmentCreateBody,
  TimeSegmentListParams,
  TimeSegmentUpdateBody,
} from "../interfaces/time-tracking.interface";

const BASE = "/hr/control-horas/";

/**
 * Arreglo plano, SIN paginación. Se pide siempre acotado a un empleado y un
 * día (los tramos de UNA asistencia); el filtro por `asistencia` lo hace el
 * hook, porque el backend no lo ofrece.
 */
export const getTimeSegments = async (params: TimeSegmentListParams): Promise<TimeSegment[]> => {
  const { data } = await v1_api.get<TimeSegment[]>(BASE, { params });
  return data;
};

export const createTimeSegment = async (body: TimeSegmentCreateBody): Promise<TimeSegment> => {
  const { data } = await v1_api.post<TimeSegment>(BASE, body);
  return data;
};

/** PATCH parcial, nunca PUT. Ver `TimeSegmentUpdateBody`: las dos horas van siempre. */
export const updateTimeSegment = async (
  id: number,
  body: TimeSegmentUpdateBody
): Promise<TimeSegment> => {
  const { data } = await v1_api.patch<TimeSegment>(`${BASE}${id}/`, body);
  return data;
};

/** Borrado FÍSICO (204). Nada depende de un tramo. */
export const deleteTimeSegment = async (id: number): Promise<void> => {
  await v1_api.delete(`${BASE}${id}/`);
};
