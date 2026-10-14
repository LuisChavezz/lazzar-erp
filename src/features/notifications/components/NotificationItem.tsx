import type { RefObject } from "react";
import { CheckCircleIcon } from "../../../components/Icons";
import type { Notificacion } from "../interfaces/notification.interface";
import { resolveNotificationIconVariant } from "../constants/notificationTargets";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { refocusOnUnmount } from "../utils/refocusOnUnmount";
import { NotificationIcon } from "./NotificationIcon";

interface Props {
  notificacion: Notificacion;
  /**
   * Instante contra el que se calcula la etiqueta relativa. Lo aporta el
   * `dataUpdatedAt` de la consulta; nunca se lee el reloj aquí.
   */
  nowMs: number;
  /**
   * `false` cuando la notificación no tiene destino (`tipo` fuera del mapa,
   * `data` sin el id que necesita o ruta que el usuario no puede abrir): la
   * fila se pinta igual pero deja de ser un botón y no navega a ninguna parte.
   */
  isActionable: boolean;
  onActivate: () => void;
  /**
   * Marca la notificación como leída sin abrir nada. Solo se ofrece en las
   * filas SIN destino y no leídas: las accionables ya se marcan al activarse,
   * y un botón anidado dentro de la fila-botón no sería válido.
   */
  onMarkRead: () => void;
  /**
   * Destino del foco cuando "Marcar leída" desaparece al pulsarse (el
   * optimista deja la fila en leída en el acto).
   */
  focusFallbackRef: RefObject<HTMLElement | null>;
}

export function NotificationItem({
  notificacion,
  nowMs,
  isActionable,
  onActivate,
  onMarkRead,
  focusFallbackRef,
}: Props) {
  const baseClass =
    "p-4 border-b border-slate-50 dark:border-slate-800/50 flex gap-3 relative";
  const stateClass = notificacion.leido ? " opacity-60" : "";
  const interactiveClass = isActionable
    ? " hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
    : "";

  // Solo las accionables reciben semántica y manejadores de botón.
  const interactiveProps = isActionable
    ? {
        role: "button" as const,
        tabIndex: 0,
        onClick: onActivate,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onActivate();
          }
        },
      }
    : {};

  return (
    <div
      className={`${baseClass}${stateClass}${interactiveClass}`}
      {...interactiveProps}
    >
      <NotificationIcon
        variant={resolveNotificationIconVariant(notificacion.tipo)}
      />
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">
          {notificacion.titulo}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
          {notificacion.mensaje}
        </p>
        <span className="text-[10px] text-slate-400 mt-2 block">
          {formatRelativeTime(notificacion.created_at, nowMs)}
        </span>
        {/* Mismo control que el modal "Ver todas" para las filas sin destino. */}
        {!isActionable && !notificacion.leido && (
          <button
            ref={refocusOnUnmount(focusFallbackRef)}
            type="button"
            onClick={onMarkRead}
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-700 px-2 py-1 rounded-full cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
          >
            <CheckCircleIcon className="w-3 h-3" aria-hidden="true" />
            Marcar leída
          </button>
        )}
      </div>
      {!notificacion.leido && (
        <div
          className="absolute right-2 top-2 w-2 h-2 bg-red-500 rounded-full"
          aria-hidden="true"
          role="presentation"
        ></div>
      )}
    </div>
  );
}
