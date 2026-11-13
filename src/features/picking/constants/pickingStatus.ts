import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { PickingEstado } from "../interfaces/picking.interface";

/**
 * Colores por estatus de un picking: los 7 de `Picking.Estado`. El alta deja
 * el picking en `"Completado"` o `"Parcial"` (ver `PickingEstado` en
 * `picking.interface.ts`); los pickings antiguos siguen en `"Pendiente"` y hay
 * `"Cancelado"` en los datos, aunque hoy ningún flujo lo asigna. Los otros
 * tres existen en el modelo sin que nada los asigne.
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

/**
 * Estatus desde los que el backend permite trasladar un picking a otro almacén
 * (`POST /wms/pickings/{id}/trasladar/`). Copia literal de
 * `PickingService.ESTADOS_TRASLADABLES`: es una lista blanca, no "todo menos
 * los terminales", así que un estatus nuevo en el enum NO queda trasladable
 * hasta que el backend lo añada. Fuera de ella el `POST` responde 400 `estado`.
 */
export const PICKING_ESTADOS_TRASLADABLES: readonly PickingEstado[] = [
  "Pendiente",
  "Asignado",
  "En proceso",
  "Pausado",
  "Parcial",
  "Completado",
];
