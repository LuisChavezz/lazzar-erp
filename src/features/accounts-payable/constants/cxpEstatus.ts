import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { CxPEstatus } from "../interfaces/accounts-payable.interface";

/**
 * Colores por estatus de una cuenta por pagar. Las llaves son los valores
 * CRUDOS del backend —el valor y la etiqueta son el mismo string—.
 *
 * `Record<CxPEstatus, ...>` obliga a cubrir los cuatro valores del enum: si el
 * tipo gana uno, TypeScript exige su entrada aquí; si el backend lo emitiera sin
 * que el tipo cambie, `StatusBadge` degrada a su estilo por defecto en vez de
 * romperse.
 *
 * NO hay entrada `Vencida`: no es un estatus (ver `CxPEstatus`). La marca de
 * vencida es aparte (`CXP_VENCIDA_BADGE_CONFIG`) y se deriva con
 * `isCuentaPorPagarVencida`.
 *
 * Vive aquí, y no en `AccountsPayableColumns.tsx`, porque la consumen la tabla y
 * el diálogo de detalle.
 */
export const CXP_ESTATUS_CONFIG: Record<CxPEstatus, StatusBadgeConfigEntry> = {
  Pendiente: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-400",
  },
  Parcial: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  Pagada: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelada: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

/**
 * Llave de la marca DERIVADA de vencida. A propósito no coincide con ningún
 * valor de `estatus`: se pinta JUNTO al badge de estatus, nunca en su lugar.
 */
export const CXP_VENCIDA_BADGE_KEY = "vencida-derivada";

export const CXP_VENCIDA_BADGE_CONFIG: Record<
  typeof CXP_VENCIDA_BADGE_KEY,
  StatusBadgeConfigEntry
> = {
  [CXP_VENCIDA_BADGE_KEY]: {
    label: "Vencida",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};
