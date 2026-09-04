import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import type { NotificacionesListState } from "../hooks/useNotificaciones";

interface Props {
  /** Discriminador único del hook — ver `NotificacionesListState`. */
  listState: NotificacionesListState;
  error: unknown;
  /** `true` cuando la consulta resolvió y no hay nada que pintar. */
  isEmpty: boolean;
  emptyMessage: string;
  onRetry: () => void;
}

/**
 * Estados de carga, error y vacío de la lista de notificaciones.
 *
 * Se renderiza DENTRO del contenedor de la lista, nunca en lugar del dropdown o
 * del modal completos: el encabezado con "Marcar leídas" y el pie con "Ver
 * todas" siguen montados mientras carga o falla, para que la superficie no se
 * convierta en un spinner suelto ni en una pantalla de error.
 *
 * Un refetch fallido CON datos en caché no llega aquí: su estado es `ready`,
 * así que la lista anterior se conserva y el aviso lo da el toast de
 * `useHasLoadedQuery` (mismo criterio que `isInitialLoadError`).
 *
 * Devuelve `null` cuando hay datos que pintar.
 */
export function NotificationsListStatus({
  listState,
  error,
  isEmpty,
  emptyMessage,
  onRetry,
}: Props) {
  if (listState === "error") {
    return (
      <div className="p-6 flex flex-col items-center gap-2 text-center">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {extractErrorMessage(
            error,
            "No se pudieron cargar las notificaciones",
          )}
        </p>
        <button
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
