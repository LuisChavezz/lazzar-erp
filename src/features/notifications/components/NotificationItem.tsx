import type { Notificacion } from "../interfaces/notification.interface";
import { resolveNotificationIconVariant } from "../constants/notificationTargets";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import { NotificationIcon } from "./NotificationIcon";

interface Props {
  notificacion: Notificacion;
  /**
   * Instante contra el que se calcula la etiqueta relativa. Lo aporta el
   * `dataUpdatedAt` de la consulta; nunca se lee el reloj aquí.
   */
  nowMs: number;
  /**
   * `false` cuando el `tipo` no está en el mapa de destinos: la fila se pinta
   * igual pero deja de ser un botón y no navega a ninguna parte.
   */
  isActionable: boolean;
  onActivate: () => void;
}

export function NotificationItem({
  notificacion,
  nowMs,
  isActionable,
  onActivate,
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
