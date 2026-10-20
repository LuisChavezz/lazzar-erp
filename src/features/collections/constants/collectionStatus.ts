import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type {
  CobroEstatus,
  CobroMetodoPago,
  CobroReferencia,
} from "../interfaces/collection.interface";

/**
 * Presentación del `estatus` del cobro. Las llaves son los valores CRUDOS del
 * backend y cubren el enum COMPLETO: `Borrador` se incluye aunque esta UI aún
 * no cree borradores (EC-548), porque una lectura puede traerlo.
 */
export const COBRO_ESTATUS_CONFIG: Record<CobroEstatus, StatusBadgeConfigEntry> = {
  Borrador: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Aplicado: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelado: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

/**
 * Presentación del `metodo_pago`, una entrada por valor del enum. El backend ya
 * nombra los valores en español, así que la etiqueta es el valor mismo.
 */
export const COBRO_METODO_PAGO_CONFIG: Record<CobroMetodoPago, StatusBadgeConfigEntry> = {
  Transferencia: {
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Efectivo: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cheque: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Tarjeta: {
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
};

/** Etiqueta de cada valor del enum `referencia` (el backend lo guarda sin acento). */
export const COBRO_REFERENCIA_LABELS: Record<CobroReferencia, string> = {
  SPEI: "SPEI",
  Cheque: "Cheque",
  "Autorizacion TPV": "Autorización TPV",
};
