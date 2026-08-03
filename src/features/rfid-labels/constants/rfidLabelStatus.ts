import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { EtiquetaRFIDStatus } from "../interfaces/rfid-label.interface";

/**
 * Colores por estatus de un evento de impresión (`EtiquetaRFIDImpresion.status`).
 * Vocabulario real del backend — construido completo contra las 3 opciones
 * documentadas (`PENDIENTE`/`EXITO`/`FALLIDO`), no solo las que aparezcan hoy
 * en datos reales.
 */
export const RFID_LABEL_STATUS_CONFIG: Record<EtiquetaRFIDStatus, StatusBadgeConfigEntry> = {
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  EXITO: {
    label: "Éxito",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  FALLIDO: {
    label: "Fallido",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};
