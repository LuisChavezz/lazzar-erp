import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { getNotificacionesSinLeer } from "../services/actions";
import { trackNotificationArrivals } from "../utils/notificationArrivals";
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
 * - Lo NUEVO lo decide `trackNotificationArrivals` (estado compartido con la
 *   lista de la campana). Vive en `queryFn` y no en un efecto, para que corra
 *   una sola vez por respuesta aunque la campana esté montada dos veces (header
 *   y sidebar móvil).
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
        const next = await getNotificacionesSinLeer();
        trackNotificationArrivals(queryClient, {
          maxId: next.ultima_notificacion_id,
          unread: next.count,
        });
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
