import { v1_api } from "@/src/api/v1.api";
import type {
  MarcarTodasLeidasResponse,
  Notificacion,
  NotificacionesSinLeer,
} from "../interfaces/notification.interface";

/** Contador de no leídas del usuario de la sesión (dos consultas indexadas). */
export const getNotificacionesSinLeer = async (
  signal?: AbortSignal,
): Promise<NotificacionesSinLeer> => {
  const response = await v1_api.get<NotificacionesSinLeer>(
    "/notificaciones/sin-leer/count/",
    { signal },
  );
  return response.data;
};

/**
 * Historial completo de notificaciones del usuario de la sesión.
 * Sin `?limit=` el endpoint devuelve un array plano con todo el historial (ver
 * la nota del contrato en `interfaces/`); no se pide paginado ni con
 * `?ordering=`, y el recorte lo hace el cliente.
 */
export const getNotificaciones = async (): Promise<Notificacion[]> => {
  const response = await v1_api.get<Notificacion[]>("/notificaciones/");
  return response.data;
};

/**
 * Marca UNA notificación como leída. El endpoint no recibe cuerpo —fija
 * `leido` y `leido_at` en el servidor— y responde con el objeto ya serializado.
 */
export const marcarNotificacionLeida = async (
  id: number,
): Promise<Notificacion> => {
  const response = await v1_api.post<Notificacion>(
    `/notificaciones/${id}/marcar-leida/`,
  );
  return response.data;
};

/**
 * Marca TODAS las no leídas del usuario. Sin cuerpo, y el backend ignora
 * cualquier filtro: siempre actúa sobre el historial completo.
 */
export const marcarTodasLeidas = async (): Promise<MarcarTodasLeidasResponse> => {
  const response = await v1_api.post<MarcarTodasLeidasResponse>(
    "/notificaciones/marcar-todas-leidas/",
  );
  return response.data;
};
