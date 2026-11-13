import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { PickingDetalleEstado } from "../interfaces/picking.interface";

/**
 * Colores y etiqueta del estatus de UNA LÍNEA de picking
 * (`PickingDetalleLine.estado`): enum propio, distinto del estatus del picking
 * completo (`PICKING_STATUS_CONFIG`). Lo usan el diálogo de detalle y el PDF
 * del surtido (EC-858).
 */
export const PICKING_LINEA_ESTADO_CONFIG: Record<PickingDetalleEstado, StatusBadgeConfigEntry> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  SURTIDA: {
    label: "Surtida",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  PARCIAL: {
    label: "Parcial",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  FALTANTE: {
    label: "Faltante",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  CANCELADA: {
    label: "Cancelada",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};
