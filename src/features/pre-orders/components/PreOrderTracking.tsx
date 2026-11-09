"use client";

import { ActivityTimeline, ActivityTimelineItem } from "@/src/components/ActivityTimeline";
import { EmptyLines } from "@/src/components/DetailDialogPrimitives";
import { OrdenesIcon } from "@/src/components/Icons";
import { formatShortDate, formatShortDateTime } from "@/src/utils/formatDate";
import { MEXICO_TIME_ZONE } from "@/src/utils/mexicoTime";
import { usePreOrderHistory } from "../hooks/usePreOrders";
import type {
  PreOrderRegreso,
  PreOrderSemaforo,
  PurchaseNeedStatus,
} from "../interfaces/pre-order.interface";

const SEMAFORO = {
  verde: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", label: "A tiempo" },
  amarillo: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", label: "Justo" },
  rojo: { dot: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", label: "Tarde" },
} satisfies Record<PreOrderSemaforo, { dot: string; text: string; label: string }>;

const SEMAFORO_HINT: Record<PreOrderSemaforo, string> = {
  verde: "El material llega con margen antes del compromiso.",
  amarillo: "El material llega con 3 días o menos antes del compromiso.",
  rojo: "El material llega después del compromiso del pedido.",
};

/** Semáforo de la pre-orden (lo calcula el backend). Punto + palabra, nunca solo color. */
export function SemaforoBadge({
  semaforo,
  compact = false,
}: {
  semaforo: PreOrderSemaforo | null | undefined;
  compact?: boolean;
}) {
  if (!semaforo) return <span className="text-xs text-slate-400 dark:text-slate-500">—</span>;
  const cfg = SEMAFORO[semaforo];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap ${cfg.text}`}
      title={SEMAFORO_HINT[semaforo]}
    >
      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} aria-hidden="true" />
      {compact ? cfg.label : `Material ${cfg.label.toLowerCase()}`}
    </span>
  );
}

/** Aviso de que la pre-orden regresó porque otra OP consumió el material. */
export function RegresoAlert({ regreso }: { regreso: PreOrderRegreso }) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-2xl border border-rose-200 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 px-5 py-3 text-sm text-rose-800 dark:text-rose-200"
    >
      <p className="font-semibold">
        Regresó a “Faltan materiales” el {formatShortDate(regreso.fecha, { timeZone: MEXICO_TIME_ZONE })}
      </p>
      <p className="mt-0.5 text-xs">{regreso.motivo} Hay que volver a confirmar existencias.</p>
    </div>
  );
}

export const NEED_STATUS_CFG: Record<PurchaseNeedStatus, { cls: string; dot: string; label: string }> = {
  pendiente: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Pendiente",
  },
  en_oc: {
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
    dot: "bg-violet-500",
    label: "En OC",
  },
  recibida: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Recibida",
  },
  huerfana: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
    label: "Huérfana",
  },
  cancelada: {
    cls: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
    dot: "bg-slate-400",
    label: "Cancelada",
  },
};

/** Línea de tiempo de la pre-orden (`/historial/`), lo más reciente arriba. */
export function PreOrderHistory({ preOrderId }: { preOrderId: number }) {
  const { events, hasLoaded, isInitialError } = usePreOrderHistory(preOrderId);
  if (!hasLoaded) {
    return <div className="h-20 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />;
  }
  if (isInitialError) return <EmptyLines>No se pudo cargar el historial.</EmptyLines>;
  if (events.length === 0) return <EmptyLines>Sin movimientos todavía.</EmptyLines>;

  const ordered = [...events].sort((a, b) => b.fecha.localeCompare(a.fecha));
  return (
    <ActivityTimeline ariaLabel="Historial de la pre-orden">
      {ordered.map((event, index) => (
        <ActivityTimelineItem
          key={`${event.id}-${event.evento}-${event.fecha}`}
          icon={<OrdenesIcon className="w-4 h-4" />}
          title={event.evento_display || event.evento}
          muted={index > 0}
          meta={
            <>
              <span>{formatShortDateTime(event.fecha)}</span>
              {(event.usuario_nombre || typeof event.usuario === "string") && (
                <span>{event.usuario_nombre ?? event.usuario}</span>
              )}
            </>
          }
        >
          {event.descripcion && (
            <p className="text-xs text-slate-600 dark:text-slate-300">{event.descripcion}</p>
          )}
        </ActivityTimelineItem>
      ))}
    </ActivityTimeline>
  );
}
