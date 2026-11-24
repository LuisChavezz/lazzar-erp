import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { ShipmentEstado } from "../interfaces/shipping.interface";

/**
 * Estado de un envío (`Despacho.estado`, nucleo-erp #1348). Cancelado en rose,
 * como los demás documentos cancelados.
 */
export const SHIPMENT_STATUS_CONFIG: Record<ShipmentEstado, StatusBadgeConfigEntry> = {
  ACTIVO: {
    label: "Activo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  CANCELADO: {
    label: "Cancelado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
