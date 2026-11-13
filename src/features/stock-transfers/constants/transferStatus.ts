import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Colores por estatus de un traspaso: los cinco de
 * `Transferencia.TransferenciaStatus` (nucleo-erp, `wms/models.py`), con sus
 * mismas etiquetas. El backend fija `"COMPLETADA"` al crear (ver `Transferencia`
 * en `stock-transfer.interface.ts`) y hoy ningún flujo asigna otro, pero el
 * modelo los admite y el PDF marca `CANCELADA` y `FALLIDA` (EC-858).
 * `StatusBadge` degrada a su estilo gris ante un valor fuera de esta lista.
 */
export const TRANSFER_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  EN_PROCESO: {
    label: "En proceso",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  COMPLETADA: {
    label: "Completada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CANCELADA: {
    label: "Cancelada",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  FALLIDA: {
    label: "Fallida",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
