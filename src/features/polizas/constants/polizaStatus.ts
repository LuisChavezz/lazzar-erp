import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { PolizaEstatus, PolizaTipo } from "../interfaces/poliza.interface";

/**
 * Presentación del `estatus` de la póliza. Las llaves son los valores CRUDOS del
 * backend, no etiquetas traducidas.
 *
 * `Contabilizada` va en EMERALD y no en ámbar —al revés que la nota de crédito
 * `Emitida`— porque aquí el estado final es el estado bueno: una póliza
 * contabilizada es un asiento cerrado y cuadrado, no una operación con efecto
 * pendiente de vigilar. Lo que conviene distinguir es el borrador, que todavía
 * no forma parte de la contabilidad.
 */
export const POLIZA_ESTATUS_CONFIG: Record<PolizaEstatus, StatusBadgeConfigEntry> = {
  Borrador: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Contabilizada: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelada: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/**
 * Presentación del `tipo`. También con las llaves crudas del backend: el
 * `StatusBadge` de la columna de tipo las muestra tal cual, así que la etiqueta
 * ya viene en español desde el enum.
 */
export const POLIZA_TIPO_CONFIG: Record<PolizaTipo, StatusBadgeConfigEntry> = {
  Diario: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Ingreso: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Egreso: {
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  Ajuste: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
};
