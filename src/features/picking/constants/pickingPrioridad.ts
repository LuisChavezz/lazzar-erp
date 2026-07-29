import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { PickingPrioridad } from "../interfaces/picking.interface";

/**
 * Entrada de estilo por prioridad. Extiende `StatusBadgeConfigEntry` (lo que
 * necesita el badge de la columna) con las dos claves extra que consume el
 * desglose (`PickingPriorityBreakdown`): el color de su barra segmentada y el
 * del porcentaje.
 */
export interface PickingPrioridadConfigEntry extends StatusBadgeConfigEntry {
  label: string;
  /** Color del segmento en la barra del desglose. */
  bar: string;
  /** Color del porcentaje bajo cada tarjeta del desglose. */
  chip: string;
}

/**
 * FUENTE ÚNICA de color por prioridad, compartida por el badge de la columna
 * "Prioridad" y el desglose "Pickings por Prioridad" — antes el desglose tenía
 * su propio mapa y la columna pintaba texto plano sin color, así que la
 * urgencia solo se leía en las tarjetas y no en la tabla.
 *
 * Criterio semántico ya usado en el resto del proyecto (rose = urgente,
 * amber = moderado, sky = bajo), el mismo de los rangos de antigüedad de
 * `AccountsReceivableAgingSummary`.
 *
 * Los valores son los tres `Picking.Prioridad` del backend, en string plano
 * (ver `PickingPrioridad`).
 */
export const PICKING_PRIORIDAD_CONFIG: Record<PickingPrioridad, PickingPrioridadConfigEntry> = {
  ALTA: {
    label: "Alta",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
    chip: "text-rose-600 dark:text-rose-400",
  },
  MEDIA: {
    label: "Media",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-400",
    bar: "bg-amber-400",
    chip: "text-amber-600 dark:text-amber-400",
  },
  BAJA: {
    label: "Baja",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    chip: "text-sky-600 dark:text-sky-400",
  },
};

/** De la más urgente a la menos: orden de lectura del desglose y del filtro. */
export const PICKING_PRIORIDAD_ORDER: PickingPrioridad[] = ["ALTA", "MEDIA", "BAJA"];

/**
 * Peso de urgencia para ordenar la columna "Prioridad". Sin esto el sort es
 * alfabético sobre el string crudo (ALTA → BAJA → MEDIA), que mezcla la más
 * urgente con la menos y no significa nada para el usuario.
 */
const PICKING_PRIORIDAD_RANK: Record<PickingPrioridad, number> = {
  ALTA: 3,
  MEDIA: 2,
  BAJA: 1,
};

/**
 * Peso de una prioridad, con degradación explícita ante un valor fuera del
 * enum: indexar el mapa a secas devolvería `undefined` y el comparador daría
 * `NaN`, que no solo desordena la fila desconocida sino que vuelve
 * INCONSISTENTE toda la comparación (con `NaN` ningún par cumple `<`, `>` ni
 * `=`), dejando la columna entera en un orden arbitrario. El resto del módulo
 * ya degrada así (el fallback de `StatusBadge`, la guarda `in` de
 * `computePickingKpis`).
 */
export const pickingPrioridadRank = (prioridad: PickingPrioridad): number =>
  PICKING_PRIORIDAD_RANK[prioridad] ?? 0;
