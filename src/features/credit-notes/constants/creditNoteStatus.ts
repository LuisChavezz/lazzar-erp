import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { NotaCreditoEstatus } from "../interfaces/credit-note.interface";

/**
 * Presentación del `estatus` de la nota de crédito. Las llaves son los valores
 * CRUDOS del backend, no etiquetas traducidas.
 *
 * Los tres son alcanzables desde esta pantalla, a diferencia de pagos: el alta
 * ofrece `Borrador` y `Emitida`, y `Cancelada` la produce la acción
 * `/cancelar/`.
 *
 * `Emitida` va en ámbar y no en verde a propósito: no es un estado "todo bien"
 * sino el único con efecto contable —descontó saldo de una cuenta por cobrar—,
 * y conviene que salte a la vista frente al borrador inocuo.
 */
export const NOTA_CREDITO_ESTATUS_CONFIG: Record<
  NotaCreditoEstatus,
  StatusBadgeConfigEntry
> = {
  Borrador: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  Emitida: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Cancelada: {
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
