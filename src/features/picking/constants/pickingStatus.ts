import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { PickingEstado } from "../interfaces/picking.interface";

/**
 * Colores por estatus de un picking. Hoy el backend solo asigna
 * `"Pendiente"` (ver `Picking.estado` en `picking.interface.ts`) — los otros
 * seis existen en el modelo pero nada los asigna todavía. Se cubren los 7
 * desde ahora para que un cambio futuro de backend que empiece a usarlos no
 * requiera tocar el frontend.
 */
export const PICKING_STATUS_CONFIG: Record<PickingEstado, StatusBadgeConfigEntry> = {
  Pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Asignado: {
    label: "Asignado",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  "En proceso": {
    label: "En proceso",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  Pausado: {
    label: "Pausado",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  Completado: {
    label: "Completado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Parcial: {
    label: "Parcial",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  Cancelado: {
    label: "Cancelado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
