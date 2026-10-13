import type { ReactNode } from "react";

/**
 * Línea de tiempo vertical: una lista de eventos (notas, llamadas, tareas…)
 * unidos por una línea, cada uno con su icono. Solo PRESENTACIÓN: no sabe de
 * qué dominio son los eventos ni trae lógica propia; quien la usa decide qué
 * icono, qué textos y qué acciones lleva cada uno, y en qué orden van.
 *
 * ```tsx
 * <ActivityTimeline ariaLabel="Seguimientos pendientes">
 *   <ActivityTimelineItem icon={<PhoneIcon />} title="Llamada" meta="13 oct 2026">
 *     Quedó en confirmar tallas.
 *   </ActivityTimelineItem>
 * </ActivityTimeline>
 * ```
 */
export const ActivityTimeline = ({
  children,
  ariaLabel,
}: {
  children: ReactNode;
  ariaLabel?: string;
}) => <ol aria-label={ariaLabel}>{children}</ol>;

interface ActivityTimelineItemProps {
  /** Icono del evento, dentro del círculo de la línea. */
  icon: ReactNode;
  /** Renglón de cabecera: nombre del evento y lo que lo acompañe (un control, una etiqueta). */
  title: ReactNode;
  /** Cuerpo del evento. */
  children?: ReactNode;
  /** Renglón secundario bajo el cuerpo (autor, fechas). Sus hijos se separan solos. */
  meta?: ReactNode;
  /** Acciones del evento, a la derecha de la cabecera (un menú). */
  actions?: ReactNode;
  /** Evento ya atendido o pasado: se pinta atenuado. */
  muted?: boolean;
  /**
   * Hay una operación en curso sobre el evento: se atenúa y no admite
   * interacción, ni con el ratón ni con el teclado (`inert`).
   */
  busy?: boolean;
}

/** Un evento de `ActivityTimeline`. Debe ir dentro de ella (es un `<li>`). */
export const ActivityTimelineItem = ({
  icon,
  title,
  children,
  meta,
  actions,
  muted = false,
  busy = false,
}: ActivityTimelineItemProps) => (
  <li
    aria-busy={busy || undefined}
    inert={busy || undefined}
    className={`group/timeline-item relative flex gap-3 pb-5 last:pb-0 transition-opacity ${
      busy ? "opacity-60" : ""
    }`}
  >
    {/* La línea une este icono con el siguiente; el último evento no la lleva. */}
    <span
      aria-hidden="true"
      className="absolute left-4 top-8 bottom-0 w-px bg-slate-200 dark:bg-white/10 group-last/timeline-item:hidden"
    />
    <div
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
        muted
          ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
          : "border-sky-200 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400"
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex min-h-8 min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold ${
            muted ? "text-slate-500 dark:text-slate-400" : "text-slate-800 dark:text-white"
          }`}
        >
          {title}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {children !== undefined && children !== null && (
        <div
          className={`mt-0.5 text-sm ${
            muted ? "text-slate-500 dark:text-slate-400" : "text-slate-700 dark:text-slate-200"
          }`}
        >
          {children}
        </div>
      )}
      {meta && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          {meta}
        </div>
      )}
    </div>
  </li>
);
