import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { MetodoPago, PagoEstatus } from "../interfaces/payment.interface";

/**
 * Presentación del `estatus` del pago. Las llaves son los valores CRUDOS del
 * backend, no etiquetas traducidas.
 *
 * `Borrador` se incluye porque una LECTURA puede traerlo (el enum del modelo lo
 * admite y otro cliente podría crearlo), aunque esta UI nunca lo produzca: el
 * alta manda siempre `Aplicado`.
 */
export const PAGO_ESTATUS_CONFIG: Record<PagoEstatus, StatusBadgeConfigEntry> = {
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
 * Métodos de pago del enum del backend, en el orden en que se ofrecen. El valor
 * es el que viaja al API; la etiqueta coincide porque el backend ya los nombra
 * en español.
 */
export const METODO_PAGO_OPTIONS: readonly { value: MetodoPago; label: string }[] = [
  { value: "Transferencia", label: "Transferencia" },
  { value: "Efectivo", label: "Efectivo" },
  { value: "Cheque", label: "Cheque" },
  { value: "Tarjeta", label: "Tarjeta" },
];
