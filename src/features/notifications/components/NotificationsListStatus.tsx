import type { RefObject } from "react";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { NotificacionesListState } from "../hooks/useNotificaciones";
import { refocusOnUnmount } from "../utils/refocusOnUnmount";

interface Props {
  /** Discriminador único del hook — ver `NotificacionesListState`. */
  listState: NotificacionesListState;
  error: unknown;
  /** `true` cuando la consulta resolvió y no hay nada que pintar. */
  isEmpty: boolean;
  emptyMessage: string;
  onRetry: () => void;
  /**
   * Contenedor de la lista. "Reintentar" se desmonta en cuanto arranca el
   * reintento (el estado pasa a `loading`), y el foco va aquí en vez de caer a
   * `<body>`.
   */
  focusFallbackRef: RefObject<HTMLElement | null>;
}

/**
 * Estados de carga, sin conexión, error y vacío de la lista de notificaciones.
 *
 * Se renderiza DENTRO del contenedor de la lista, nunca en lugar del dropdown o
 * del modal completos: el encabezado y el marco de la superficie siguen ahí.
 * Lo que NO sigue montado son los controles que actúan sobre la lista ("Marcar
 * todas", "Ver todas", búsqueda, orden): existen solo en `ready`. En `offline`
 * y `error` lo único accionable es el "Reintentar" de este componente; durante
 * ese reintento, sin datos, query-core vuelve la consulta a `pending` y el
 * estado pasa a `loading` (o de nuevo a `offline` si sigue sin red).
 *
 * Un refetch fallido o pausado CON datos en caché no llega aquí: su estado es
 * `ready`, así que la lista anterior se conserva y el aviso de un fallo lo da
 * el toast de `useHasLoadedQuery` (mismo criterio que `isInitialLoadError`).
 *
 * Devuelve `null` cuando hay datos que pintar.
 */
export function NotificationsListStatus({
  listState,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
  focusFallbackRef,
}: Props) {
  if (listState === "error" || listState === "offline") {
    return (
      <div className="p-6 flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {listState === "offline"
            ? "Sin conexión a internet. No se pudieron cargar las notificaciones."
            : extractErrorMessage(
                error,
                "No se pudieron cargar las notificaciones",
              )}
        </p>
        <button
          ref={refocusOnUnmount(focusFallbackRef)}
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 cursor-pointer"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (listState === "loading") {
    return (
      <div className="p-6 flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-slate-200 dark:border-slate-700 border-t-sky-500 dark:border-t-sky-400 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cargando notificaciones...
        </p>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <p className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return null;
}
