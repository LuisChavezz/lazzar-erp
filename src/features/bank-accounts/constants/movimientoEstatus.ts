import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Presentación del `estatus` de un movimiento del resumen de cuenta. Las llaves
 * son los valores CRUDOS del backend ("Pendiente" / "Conciliado" / "Cancelado"),
 * no etiquetas traducidas.
 *
 * Los cancelados se muestran igual que el resto, solo atenuados: ocultarlos
 * escondería justo la razón por la que `total_abonos_mes` puede no cuadrar con
 * la suma visible (ver el defecto conocido en `ResumenCuentaBancaria`).
 */
export const MOVIMIENTO_ESTATUS_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  Pendiente: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Conciliado: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelado: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

/** Presentación del sentido del movimiento ("Cargo" / "Abono"). */
export const TIPO_MOVIMIENTO_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  Cargo: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  Abono: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
};
