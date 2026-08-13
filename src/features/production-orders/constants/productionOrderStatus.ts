import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Colores y etiquetas por estatus de una orden de producción
 * (`OrdenProduccion.estatus_op`, 1-7).
 *
 * Las etiquetas locales son las del backend con los ACENTOS que el enum de
 * Python omite ("Preparacion" → "Preparación", "Revision" → "Revisión"); mismo
 * criterio ya aplicado en `EMBROIDERY_STATUS_CONFIG`,
 * `REFLECTIVE_ORDER_STATUS_CONFIG` y `CORTE_MANGA_ORDER_STATUS_CONFIG`.
 *
 * OJO: el `3` es "En producción" — bordado rotula "Bordando", reflejante
 * "Aplicando" y corte de manga "Cortando". Los cuatro enums son gemelos en
 * forma pero distintos en etiquetas. No se comparten configs.
 *
 * Desde que el listado usa `OrdenProduccionListSerializer` el backend manda
 * además `estatus_op_display` (la etiqueta ya resuelta). La etiqueta que se
 * pinta es esa; la de aquí solo entra como respaldo si llega vacía, y el color
 * siempre sale de este mapa indexado por el entero `estatus_op`.
 *
 * El objeto intermedio con llaves numéricas obliga a TypeScript a exigir las 7
 * entradas (`satisfies`); lo exportado se tipa `Record<string, …>` porque
 * `StatusBadge` recibe el estatus ya convertido a string.
 */
const STATUS_BY_CODE = {
  1: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  2: {
    label: "Preparación",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  3: {
    label: "En producción",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  4: {
    label: "Revisión",
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  5: {
    label: "Completado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  6: {
    label: "Detenido",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  7: {
    label: "Cancelado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
} satisfies Record<number, StatusBadgeConfigEntry>;

export const PRODUCTION_ORDER_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> =
  STATUS_BY_CODE;

/** Badge neutro para estatus fuera de 1-7, rotulado con lo que mande el backend. */
const NEUTRAL_STATUS_CFG: StatusBadgeConfigEntry = {
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
};

/**
 * Entrada de badge para un estatus concreto: el COLOR sale del mapa local
 * (indexado por el entero `estatus_op`) y la ETIQUETA del `estatus_op_display`
 * que resuelve el backend, con respaldo local si viene vacío.
 */
export const productionOrderStatusEntry = (
  estatus: number,
  display?: string | null,
): StatusBadgeConfigEntry => {
  const base = PRODUCTION_ORDER_STATUS_CONFIG[String(estatus)] ?? NEUTRAL_STATUS_CFG;
  return { ...base, label: display?.trim() || base.label || String(estatus) };
};
