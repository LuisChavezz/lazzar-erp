import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Estatus de una recepción en el detalle de puntualidad, derivado de
 * `a_tiempo` (`true` / `false` / `null`). "Sin fecha prometida" (`null`) no
 * cuenta para el puntaje: no se puede saber si llegó tarde.
 */
export type SupplierPunctualityStatus = "a_tiempo" | "tarde" | "sin_fecha";

export const toPunctualityStatus = (aTiempo: boolean | null): SupplierPunctualityStatus => {
  if (aTiempo === null) return "sin_fecha";
  return aTiempo ? "a_tiempo" : "tarde";
};

export const SUPPLIER_PUNCTUALITY_STATUS_CONFIG: Record<SupplierPunctualityStatus, StatusBadgeConfigEntry> = {
  a_tiempo: {
    label: "A tiempo",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  tarde: {
    label: "Tarde",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  sin_fecha: {
    label: "Sin fecha prometida",
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};
