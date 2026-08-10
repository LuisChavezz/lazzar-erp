import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { EmbroideryOrderStatus } from "../interfaces/embroidery.interface";

/**
 * Colores y etiquetas por estatus de una orden de bordado
 * (`OrdenesBordado.EstatusBordado`, 1-7).
 *
 * Hoy el backend SIEMPRE devuelve `1` (Pendiente): `estatus_bordado` es
 * `read_only` en el serializer y el `ViewSet` no expone transición alguna
 * (`PUT`/`PATCH` → 405). Se cubren los 7 desde ahora para que un cambio futuro
 * de backend que empiece a usarlos no requiera tocar el frontend — mismo
 * criterio que `PACKING_STATUS_CONFIG`. Por lo mismo NO se ofrece un filtro
 * por estatus en la tabla: todas las filas comparten el mismo valor.
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
    label: "Bordando",
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
} satisfies Record<EmbroideryOrderStatus, StatusBadgeConfigEntry>;

export const EMBROIDERY_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> =
  STATUS_BY_CODE;

/**
 * Etiquetas de `prioridad`. El modelo la declara `IntegerField(default=1)` SIN
 * `choices`, así que el backend acepta cualquier entero; el mapeo 1 = Alta,
 * 2 = Media, 3 = Baja es el mismo que ya usa el alta de órdenes de producción
 * (`ProductionOrderStep1`), para no inventar una escala distinta dentro del
 * mismo dominio. Cualquier otro entero cae en
 * `EMBROIDERY_PRIORITY_FALLBACK`.
 */
export const EMBROIDERY_PRIORITY_CONFIG: Record<string, StatusBadgeConfigEntry> = {
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

/**
 * Etiquetas de `cobertura_completa`: ¿esta orden sola cubre el 100% de lo que
 * el pedido contrató de bordado?
 *
 * Se indexa por el booleano convertido a string, no por un código, porque eso
 * es lo que manda el backend. "Parcial" NO es un estado de error —desde que se
 * pueden crear varias OB por pedido es el caso esperado—, así que va en un tono
 * informativo (sky) y no en ámbar/rojo de advertencia; "Completa" reutiliza el
 * verde que ya significa "terminado" en `EMBROIDERY_STATUS_CONFIG`.
 */
export const EMBROIDERY_COVERAGE_CONFIG: Record<string, StatusBadgeConfigEntry> = {
  true: {
    label: "Completa",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  false: {
    label: "Parcial",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
};

/** Badge neutro para prioridades fuera de 1-3, rotulado con el entero crudo. */
export const embroideryPriorityFallback = (
  prioridad: number,
): StatusBadgeConfigEntry => ({
  label: `Prioridad ${prioridad}`,
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
});
