import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { EmbroideryOrderStatus } from "../interfaces/embroidery.interface";

/**
 * Colores y etiquetas por estatus de una orden de bordado
 * (`OrdenesBordado.EstatusBordado`, 1-8).
 *
 * Se cubren los 8 estatus para que empezar a usarlos no requiera tocar el
 * frontend — mismo criterio que `PACKING_STATUS_CONFIG`.
 *
 * Las etiquetas reproducen las del enum de Python al pie de la letra. No es
 * casualidad ni redundancia: los enteros se RESIGNIFICARON (el 5 pasó de
 * "Completado" a "Bordando", el 7 de "Cancelado" a "Finalizado"), así que un
 * rótulo "propio" que se apartara del backend volvería a abrir la brecha que
 * este catálogo acaba de cerrar. El 8 recoge los cancelados del enum anterior
 * y por eso se rotula "(legacy)".
 *
 * El objeto intermedio con llaves numéricas obliga a TypeScript a exigir las 8
 * entradas (`satisfies`); lo exportado se tipa `Record<string, …>` porque
 * `StatusBadge` recibe el estatus ya convertido a string.
 */
const STATUS_BY_CODE = {
  1: {
    label: "Sin trabajar",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
  2: {
    label: "Programado",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  3: {
    label: "Ponchado",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  4: {
    label: "Arreglo",
    cls: "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  5: {
    label: "Bordando",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  6: {
    label: "Detenido",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
  7: {
    label: "Finalizado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  8: {
    label: "Cancelado (legacy)",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
} satisfies Record<EmbroideryOrderStatus, StatusBadgeConfigEntry>;

export const EMBROIDERY_STATUS_CONFIG: Record<string, StatusBadgeConfigEntry> =
  STATUS_BY_CODE;

/**
 * Los 8 códigos del enum, en orden ascendente.
 *
 * Se DERIVAN de `STATUS_BY_CODE` en vez de escribirse a mano porque ese objeto
 * es el único que TypeScript obliga a mantener completo (`satisfies
 * Record<EmbroideryOrderStatus, …>`): una lista literal aparte podría
 * quedarse corta al añadir un estatus y nadie se enteraría. El orden lo
 * garantiza el propio lenguaje —las llaves de índice entero se recorren
 * ascendentes—, así que no hace falta ordenarlas.
 *
 * El `as` es seguro por la misma razón: las llaves del objeto SON los códigos
 * del tipo, pero `Object.keys` las devuelve como `string[]`.
 */
export const EMBROIDERY_STATUS_CODES = Object.keys(STATUS_BY_CODE).map(
  Number,
) as EmbroideryOrderStatus[];

/** Badge neutro para estatus fuera de 1-8, rotulado con lo que mande el backend. */
const NEUTRAL_STATUS_CFG: StatusBadgeConfigEntry = {
  cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
  dot: "bg-slate-400",
};

/**
 * Entrada de badge para un estatus concreto: el COLOR sale del mapa local
 * (indexado por el entero `estatus_bordado`) y la ETIQUETA también cuando el
 * código está en 1-8. `estatus_bordado_display` del backend solo entra como
 * RESPALDO —para códigos fuera de 1-8 que este mapa no cubre—: sin él, un
 * estatus nuevo del backend se pintaría con su número crudo hasta que alguien
 * tocara este archivo. El entero es el último recurso. Mismo patrón que
 * `productionOrderStatusEntry`.
 */
export const embroideryStatusEntry = (
  estatus: number,
  display?: string | null,
): StatusBadgeConfigEntry => {
  const base = EMBROIDERY_STATUS_CONFIG[String(estatus)] ?? NEUTRAL_STATUS_CFG;
  return { ...base, label: base.label || display?.trim() || String(estatus) };
};

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
