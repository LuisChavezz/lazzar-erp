import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { RfidMatchStatus } from "../interfaces/rfid-matching.interface";

/**
 * Colores por estatus del encuadre. Set propio del dominio (no se importa de
 * otro módulo): por convención del proyecto los valores de estatus no se
 * comparten entre dominios, solo la presentación (`StatusBadge`). Ver
 * `LABEL_ESTADO_CONFIG` / `PICKING_STATUS_CONFIG`.
 */
export const RFID_MATCH_STATUS_CONFIG: Record<RfidMatchStatus, StatusBadgeConfigEntry> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  ACEPTADO: {
    label: "Aceptado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};
