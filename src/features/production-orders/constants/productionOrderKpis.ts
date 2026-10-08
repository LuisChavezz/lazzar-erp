import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";
import type { ProductionOrderKpiSemaforo } from "../interfaces/production-order-kpis.interface";

/** Badge del semáforo + colores del icono y la barra de la tarjeta. */
export interface KpiSemaforoConfigEntry extends StatusBadgeConfigEntry {
  iconClass: string;
  iconBgClass: string;
}

/**
 * Semáforo del cumplimiento a tiempo, tal como lo decide el backend contra su
 * `meta`. Mismo patrón que `TRAZABILIDAD_SEMAFORO_CONFIG` (orders), con otro
 * vocabulario: aquí se compara contra una meta, no contra una fecha. `Record`
 * sobre la unión COMPLETA: un valor nuevo sin entrada no compila.
 */
const KPI_SEMAFORO_CONFIG: Record<ProductionOrderKpiSemaforo, KpiSemaforoConfigEntry> = {
  verde: {
    label: "En meta",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
    iconClass: "text-emerald-500",
    iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
  },
  amarillo: {
    label: "Cerca de la meta",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
    iconClass: "text-amber-500",
    iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
  },
  rojo: {
    label: "Fuera de meta",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
    iconClass: "text-red-500",
    iconBgClass: "bg-red-50 dark:bg-red-500/10",
  },
  sin_datos: {
    label: "Sin datos",
    cls: "bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300",
    dot: "bg-slate-400",
    iconClass: "text-slate-400",
    iconBgClass: "bg-slate-50 dark:bg-slate-500/10",
  },
};

/**
 * Respaldo neutro para un valor que el backend mande y esta UI no conozca.
 * Sin `label`: `StatusBadge` muestra el valor crudo.
 */
const KPI_SEMAFORO_NEUTRAL_CONFIG: KpiSemaforoConfigEntry = {
  cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
  dot: "bg-slate-400",
  iconClass: "text-slate-400",
  iconBgClass: "bg-slate-50 dark:bg-slate-500/10",
};

/**
 * Entrada del semáforo con respaldo neutro: el `Record` solo protege en
 * compilación. `Object.hasOwn` para que un valor como `constructor` no resuelva
 * a algo heredado de `Object.prototype`.
 */
export const getKpiSemaforoConfig = (semaforo: string): KpiSemaforoConfigEntry =>
  Object.hasOwn(KPI_SEMAFORO_CONFIG, semaforo)
    ? KPI_SEMAFORO_CONFIG[semaforo as ProductionOrderKpiSemaforo]
    : KPI_SEMAFORO_NEUTRAL_CONFIG;
