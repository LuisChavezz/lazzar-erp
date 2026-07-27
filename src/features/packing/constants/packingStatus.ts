import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { PackingEstado } from "../interfaces/packing.interface";

/**
 * Colores por estatus de un packing. Hoy el backend solo asigna
 * `"PENDIENTE"` (ver `Packing.estado` en `packing.interface.ts`) — los otros
 * tres existen en el modelo pero nada los asigna todavía (no hay endpoint de
 * transición). Se cubren los 4 desde ahora para que un cambio futuro de
 * backend que empiece a usarlos no requiera tocar el frontend.
 */
export const PACKING_STATUS_CONFIG: Record<PackingEstado, StatusBadgeConfigEntry> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  EN_PROCESO: {
    label: "En proceso",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  COMPLETADO: {
    label: "Completado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CANCELADO: {
    label: "Cancelado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
