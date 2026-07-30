import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { LabelEstado } from "../interfaces/label.interface";

/**
 * Colores por estatus de impresión de una etiqueta. Set propio del dominio
 * (no se importa de otro módulo): por convención del proyecto los valores de
 * estatus no se comparten entre dominios, solo la presentación
 * (`StatusBadge`). Ver `PACKING_STATUS_CONFIG` / `DISPATCH_LINE_STATUS_CONFIG`.
 */
export const LABEL_ESTADO_CONFIG: Record<LabelEstado, StatusBadgeConfigEntry> = {
  IMPRESA: {
    label: "Impresa",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  PENDIENTE: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  REIMPRESION: {
    label: "Reimpresión",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
};
