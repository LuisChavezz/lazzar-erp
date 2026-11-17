import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { SalidaMaquilaEstatus } from "../interfaces/salida-maquila.interface";

export const SALIDA_MAQUILA_STATUS_CONFIG: Record<SalidaMaquilaEstatus, StatusBadgeConfigEntry> = {
  ENVIADA: {
    label: "En maquila",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  RECIBIDA: {
    label: "Recibida",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  CANCELADA: {
    label: "Cancelada",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

/** Cerrar y cancelar solo existen desde ENVIADA. */
export const isSalidaMaquilaAbierta = (estatus: SalidaMaquilaEstatus): boolean => estatus === "ENVIADA";
