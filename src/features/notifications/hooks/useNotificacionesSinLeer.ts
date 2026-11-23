import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getNotificacionesSinLeer } from "../services/actions";
import { NOTIFICATION_RELATED_QUERY_KEYS } from "../constants/notificationInvalidations";
import type { NotificacionesSinLeer } from "../interfaces/notification.interface";
import { NOTIFICACIONES_QUERY_KEY } from "./useNotificaciones";

/**
 * Cuelga de `["notificaciones"]` A PROPÓSITO: las dos mutaciones de marcar
 * como leída invalidan ese prefijo en `onSettled`, así que el badge baja en
 * cuanto el servidor confirma, sin que ellas conozcan esta llave.
 */
export const NOTIFICACIONES_SIN_LEER_QUERY_KEY = [
  ...NOTIFICACIONES_QUERY_KEY,
  "sin-leer",
  "count",
] as const;

/** Cada cuánto se consulta el contador con la pestaña visible. */
export const NOTIFICACIONES_POLL_INTERVAL_MS = 60_000;

/**
 * Llegó al menos una notificación: refresca la lista de la campana (solo
 * ella, `exact`, para no volver a disparar el contador) y TODAS las consultas
 * relacionadas. El contador no dice el `tipo` de lo nuevo, y averiguarlo
 * exigiría traer el historial completo (el endpoint no pagina) por cada aviso;
 * invalidar el conjunto entero es correcto y barato, porque solo se vuelven a
 * pedir las consultas montadas: las demás quedan marcadas como viejas.
 */
const invalidateAfterNewNotification = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({
    queryKey: NOTIFICACIONES_QUERY_KEY,
    exact: true,
  });
  NOTIFICATION_RELATED_QUERY_KEYS.forEach((queryKey) => {
    void queryClient.invalidateQueries({ queryKey });
  });
};

/**
 * Contador de no leídas (`GET /notificaciones/sin-leer/count/`): la
 * "simulación de tiempo real" de EC-555.
 *
 * - Sondea cada `NOTIFICACIONES_POLL_INTERVAL_MS` SOLO con la pestaña visible
 *   (`refetchIntervalInBackground: false`), y al volver a ella refetchea en el
 *   acto (`refetchOnWindowFocus` + `staleTime: 0`, solo en esta consulta; el
 *   default global sigue en `false`).
 * - Sin sesión no consulta. Un cambio de usuario o un cierre de sesión es una
 *   carga completa de página (EC-848), así que el contador de un usuario nunca
 *   sobrevive en la caché del siguiente.
 * - Lo NUEVO se detecta porque sube `ultima_notificacion_id` respecto de la
 *   respuesta anterior, no por `count` (que baja al marcar como leídas). La
 *   primera respuesta es la línea base: no hay anterior con qué comparar. La
 *   comparación vive en `queryFn` y no en un efecto, para que corra una sola
 *   vez por respuesta aunque la campana esté montada dos veces (header y
 *   sidebar móvil).
 * - `silent`: un sondeo de fondo fallido no avisa por toast cada racha; el
 *   badge conserva el último conteo válido y el siguiente intervalo reintenta.
 */
export const useNotificacionesSinLeer = () => {
  const queryClient = useQueryClient();
  const { status } = useSession();

  const { data } = useGuardedQuery<NotificacionesSinLeer>(
    {
      queryKey: NOTIFICACIONES_SIN_LEER_QUERY_KEY,
      queryFn: async () => {
        const previous = queryClient.getQueryData<NotificacionesSinLeer>(
          NOTIFICACIONES_SIN_LEER_QUERY_KEY,
        );
        const next = await getNotificacionesSinLeer();
        if (
          previous !== undefined &&
          next.ultima_notificacion_id > previous.ultima_notificacion_id
        ) {
          invalidateAfterNewNotification(queryClient);
        }
        return next;
      },
      enabled: status === "authenticated",
      staleTime: 0,
      refetchInterval: NOTIFICACIONES_POLL_INTERVAL_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
    },
    { toastId: "notificaciones-sin-leer-refetch-error", silent: true },
  );

  return {
    /** `undefined` mientras no hay una respuesta válida (carga o fallo inicial). */
    unreadCount: data?.count,
  };
};
