import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { ReflectiveOrderStatus } from "../interfaces/reflective-order.interface";

/**
 * Colores y etiquetas por estatus de una orden de reflejante
 * (`OrdenesReflejante.EstatusReflejante`, 1-7).
 *
 * Las etiquetas son las del backend (verificadas en el enum del modelo y en la
 * descripción de `EstatusReflejanteEnum` del esquema OpenAPI desplegado), con
 * los ACENTOS que el enum de Python omite: "Preparacion" → "Preparación",
 * "Revision" → "Revisión". Es copia de UI en español, no un valor de contrato;
 * mismo criterio ya aplicado en `EMBROIDERY_STATUS_CONFIG`.
 *
 * OJO: el `3` es "Aplicando", NO "Bordando" — reflejante y bordado tienen
 * enums gemelos en forma pero distintos en etiquetas. No se comparten configs.
 *
 * Hoy el backend SIEMPRE devuelve `1` (Pendiente): ninguna de las dos rutas de
 * alta escribe otro valor y no hay endpoint de transición (`PUT`/`PATCH` →
 * 405). Se cubren los 7 desde ahora para que un cambio futuro de backend que
 * empiece a usarlos no requiera tocar el frontend. Por lo mismo NO se ofrece un
 * filtro por estatus en la tabla: todas las filas comparten el mismo valor.
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
    label: "Aplicando",
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
} satisfies Record<ReflectiveOrderStatus, StatusBadgeConfigEntry>;

export const REFLECTIVE_ORDER_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> =
  STATUS_BY_CODE;

/**
 * Etiquetas de `prioridad`. El modelo la declara `IntegerField(default=1)` SIN
 * `choices`, así que el backend acepta cualquier entero; el mapeo 1 = Alta,
 * 2 = Media, 3 = Baja es el mismo que ya usan el alta de órdenes de producción
 * (`ProductionOrderStep1`) y el listado de bordado, para no inventar una escala
 * distinta dentro del mismo dominio. Cualquier otro entero cae en
 * `reflectiveOrderPriorityFallback`.
 */
export const REFLECTIVE_ORDER_PRIORITY_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  1: {
    label: "Alta",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  2: {
    label: "Media",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  3: {
    label: "Baja",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};

/** Badge neutro para prioridades fuera de 1-3, rotulado con el entero crudo. */
export const reflectiveOrderPriorityFallback = (
  prioridad: number,
): StatusBadgeConfigEntry => ({
  label: `Prioridad ${prioridad}`,
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
});
