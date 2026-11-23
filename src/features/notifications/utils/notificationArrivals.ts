import type { QueryClient } from "@tanstack/react-query";
import { QUOTES_QUERY_KEY } from "@/src/features/quotes/constants/quotesQueryKeys";
import { submitQuoteForReviewMutationKey } from "@/src/features/quotes/hooks/useSubmitQuoteForReview";
import { NOTIFICATION_RELATED_QUERY_KEYS } from "../constants/notificationInvalidations";
import { NOTIFICACIONES_QUERY_KEY } from "../constants/notificationQueryKeys";

/** Lo último que el cliente sabe de las notificaciones del usuario. */
interface NotificationsSeen {
  /** `id` más alto VISTO, leído o no: marcar como leída nunca lo baja. */
  maxId: number;
  /** No leídas según la última respuesta (del contador o de la lista). */
  unread: number;
}

/**
 * Estado por `QueryClient`, compartido por el contador y la lista de la campana
 * (montada dos veces: header y sidebar móvil) para que una llegada se detecte
 * UNA vez, la vea quien la vea primero. Se reinicia con el cliente: un cambio
 * de usuario o un cierre de sesión es una carga completa de página (EC-848),
 * así que nunca sobrevive al usuario anterior.
 */
const seenByClient = new WeakMap<QueryClient, NotificationsSeen>();

/**
 * Registra lo que trae una respuesta y dice si llegó algo nuevo:
 * - un `id` por encima del más alto visto (también si ya se leyó antes del
 *   siguiente sondeo, p. ej. desde la campana u otra pestaña), o
 * - más no leídas que antes con el mismo `id` máximo: las transacciones pueden
 *   confirmarse fuera del orden de sus `id` (la 101 después de la 102).
 * La primera respuesta es la línea base: no hay con qué comparar.
 */
const observe = (queryClient: QueryClient, next: NotificationsSeen): boolean => {
  const seen = seenByClient.get(queryClient);
  seenByClient.set(queryClient, {
    maxId: Math.max(seen?.maxId ?? 0, next.maxId),
    unread: next.unread,
  });
  if (seen === undefined) return false;
  return next.maxId > seen.maxId || next.unread > seen.unread;
};

/**
 * Llegó al menos una notificación: refresca la lista de la campana (solo ella,
 * `exact`, para no volver a disparar el contador) y TODAS las consultas
 * relacionadas. El contador no dice el `tipo` de lo nuevo, y averiguarlo
 * exigiría traer el historial completo (el endpoint no pagina) por cada aviso;
 * invalidar el conjunto entero es correcto y barato, porque solo se vuelven a
 * pedir las consultas montadas: las demás quedan marcadas como viejas.
 *
 * `["quotes"]` se salta mientras vuela un envío a revisión: el arrastre del
 * tablero escribe su estado optimista y un refetch a medias devolvería la
 * tarjeta a su columna; esa mutación ya invalida `["quotes"]` en `onSettled`.
 */
const invalidateAfterNewNotification = (queryClient: QueryClient) => {
  void queryClient.invalidateQueries({
    queryKey: NOTIFICACIONES_QUERY_KEY,
    exact: true,
  });
  const skipQuotes =
    queryClient.isMutating({ mutationKey: submitQuoteForReviewMutationKey }) > 0;
  NOTIFICATION_RELATED_QUERY_KEYS.forEach((queryKey) => {
    if (skipQuotes && queryKey === QUOTES_QUERY_KEY) return;
    void queryClient.invalidateQueries({ queryKey });
  });
};

/** Registra una respuesta y, si trae algo nuevo, invalida lo relacionado. */
export const trackNotificationArrivals = (
  queryClient: QueryClient,
  next: NotificationsSeen,
) => {
  if (observe(queryClient, next)) invalidateAfterNewNotification(queryClient);
};
