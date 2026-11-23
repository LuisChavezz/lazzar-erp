import type { RefObject } from "react";
import type { Notificacion } from "../interfaces/notification.interface";
import { MarkReadPill } from "./MarkReadPill";
import { NotificationTypeIcon } from "./NotificationIcon";
import { NotificationTimestamp } from "./NotificationTimestamp";

interface Props {
  notificacion: Notificacion;
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
      <NotificationTypeIcon tipo={notificacion.tipo} />
      <div className="min-w-0 pr-3">
        <p className="text-sm font-semibold text-slate-800 dark:text-white">
          {notificacion.titulo}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug line-clamp-2">
          {notificacion.mensaje}
        </p>
        <NotificationTimestamp
          createdAt={notificacion.created_at}
          className="text-[10px] text-slate-400 mt-2 block"
        />
        {/*
          Solo en las filas SIN destino. Aquí la fila entera es el botón que
          abre el destino (y de paso la marca como leída), y un botón anidado
          dentro de otro no sería válido. El modal la ofrece en TODA fila no
          leída porque allí solo el título es botón.
        */}
        {!isActionable && !notificacion.leido && (
          <MarkReadPill
            onClick={onMarkRead}
            focusFallbackRef={focusFallbackRef}
            className="mt-2"
          />
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
