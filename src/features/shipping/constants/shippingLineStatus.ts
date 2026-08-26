import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Colores por estatus de línea (`ShipmentDetalleLine.estado`, heredado de
 * `PackingDetalle.estado`). Comparte los mismos VALORES que
 * `PACKING_STATUS_CONFIG` (mismo enum de origen en el backend) pero se
 * declara aparte, no se importa desde `packing`: por convención del proyecto
 * los estatus no se comparten entre dominios, solo la presentación (ver
 * `StatusBadge`) — y este es un dominio de solo lectura, sin transición
 * propia, así que no debe acoplarse a los cambios futuros del estatus de
 * packing.
 *
 * En la práctica hoy solo se ha visto `"PENDIENTE"` (ver
 * `shipping.interface.ts`), pero se cubren los 4 valores del enum por
 * completitud, mismo criterio que `PACKING_STATUS_CONFIG`.
 */
export const SHIPPING_LINE_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
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
