import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * `estatus` de la conciliación, tal cual el enum del backend
 * (`ConciliacionBancaria.Estatus`): el valor QUE VIAJA es también la etiqueta
 * que se muestra.
 */
export const CONCILIACION_ESTATUS = ["Borrador", "Cerrada", "Cancelada"] as const;

export type ConciliacionEstatus = (typeof CONCILIACION_ESTATUS)[number];

/**
 * Presentación del estatus. Llaves = valores CRUDOS del backend.
 *
 * `Borrador` en ámbar (en curso, aún se puede trabajar), `Cerrada` en esmeralda
 * (el periodo cuadró y quedó firme) y `Cancelada` en gris (retirada, sin
 * revertir nada). Mismo criterio que `POLIZA_ESTATUS_CONFIG`.
 */
export const CONCILIACION_ESTATUS_CONFIG: Record<
  ConciliacionEstatus,
  StatusBadgeConfigEntry
> = {
  Borrador: {
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Cerrada: {
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  Cancelada: {
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

/**
 * Opciones del filtro de estatus: el enum COMPLETO, no solo los estatus
 * presentes en los datos. `DataTable` compara `String(row[id]) === value` en
 * memoria y estos valores ya son los crudos del backend.
 */
export const CONCILIACION_ESTATUS_FILTER = CONCILIACION_ESTATUS.map((estatus) => ({
  value: estatus,
  label: estatus,
}));

/**
 * ¿Es un estatus TERMINAL? Una conciliación `Cerrada` o `Cancelada` solo se
 * consulta: no se vuelve a preparar, ni se cierra, ni se cancela.
 *
 * `Cerrada` NO se ofrece cancelar aunque el backend lo aceptaría: cancelarla no
 * revierte nada —los movimientos se quedan en `Conciliado`— y dejaría un
 * periodo cerrado marcado como cancelado sin deshacer su efecto. Mismo criterio
 * con el que pólizas restringe el borrado más que el backend.
 */
export const esConciliacionTerminal = (estatus: ConciliacionEstatus): boolean =>
  estatus !== "Borrador";
