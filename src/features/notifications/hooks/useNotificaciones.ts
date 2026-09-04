import { useQuery } from "@tanstack/react-query";
import { useHasLoadedQuery } from "@/src/hooks/useHasLoadedQuery";
import { getNotificaciones } from "../services/actions";
import type { Notificacion } from "../interfaces/notification.interface";

/** Llave compartida por el dropdown, el modal y las dos mutaciones. */
export const NOTIFICACIONES_QUERY_KEY = ["notificaciones"] as const;

/**
 * Estado de la lista, ya resuelto por el hook.
 *
 * Es el ÚNICO discriminador que ven las superficies: `isPending` e `isError` no
 * se exponen a propósito, porque son excluyentes entre sí
 * (`isPending === (status === "pending")`, `isError === (status === "error")`)
 * y quien los combina espera —erróneamente— que `isPending` signifique "todavía
 * no hay datos". No lo significa: en cuanto un fetch falla, `data` sigue en
 * `undefined` pero `isPending` pasa a `false`. Derivarlo aquí una sola vez
 * impide que el siguiente consumidor repita esa lectura.
 *
 * - `loading`: sin datos y sin error todavía.
 * - `error`:   la carga INICIAL falló y no hay nada que pintar.
 * - `ready`:   hay datos. Incluye el refetch fallido con caché, cuyo aviso lo
 *              da el toast de `useHasLoadedQuery` sin tirar la lista.
 */
export type NotificacionesListState = "loading" | "error" | "ready";

/**
 * Lista las notificaciones del usuario (`GET /notificaciones/`).
 *
 * `enabled` es del llamador: la consulta NO se dispara al montar la campana
 * —que vive en el header de todas las páginas— sino solo mientras el dropdown
 * o el modal están abiertos. Ambas superficies comparten la llave, así que
 * abren sobre la misma caché.
 *
 * `staleTime: 0` es una desviación deliberada del default global de 15 min: sin
 * badge, sin `sin-leer/count` y sin polling, la única oportunidad de traer
 * datos frescos es la apertura, y con el default el usuario podría reabrir
 * durante un cuarto de hora viendo una lista vieja.
 */
export const useNotificaciones = (enabled: boolean) => {
  const query = useQuery<Notificacion[]>({
    queryKey: NOTIFICACIONES_QUERY_KEY,
    queryFn: getNotificaciones,
    enabled,
    staleTime: 0,
  });

  const { hasLoaded } = useHasLoadedQuery({
    data: query.data,
    isError: query.isError,
    toastId: "notificaciones-refetch-error",
  });

  // `hasLoaded` (`data !== undefined`) y no `isPending` es el corte correcto
  // entre "aún no hay nada" y "ya hay lista": equivale al `isLoadingError`
  // de query-core (`isError && !hasData`).
  const listState: NotificacionesListState = hasLoaded
    ? "ready"
    : query.isError
      ? "error"
      : "loading";

  return {
    notificaciones: query.data ?? [],
    listState,
    error: query.error,
    /**
     * Instante de la última respuesta exitosa. Es el "ahora" que se le pasa a
     * `formatRelativeTime`, para no leer el reloj durante el render.
     */
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
};
