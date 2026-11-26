import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { ShipmentDisplayStatus } from "../utils/shipmentDelivery";

/**
 * Estado que se muestra de un envío (`shipmentDisplayStatus`): `Despacho.estado`
 * (nucleo-erp #1348) más "Entregado", que se deriva de `fecha_entrega` (#1361).
 * Cancelado en rose, como los demás documentos cancelados.
 */
export const SHIPMENT_STATUS_CONFIG: Record<ShipmentDisplayStatus, StatusBadgeConfigEntry> = {
  ACTIVO: {
    label: "Activo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  ENTREGADO: {
    label: "Entregado",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  CANCELADO: {
    label: "Cancelado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
