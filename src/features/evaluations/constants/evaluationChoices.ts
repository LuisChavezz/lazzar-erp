import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogos de `tipo`, `periodo` y `estado` de la evaluación.
 *
 * El backend no expone endpoint de choices, así que viven aquí como constantes.
 * Tienen TRES consumidores: los `FormSelect` del alta/edición, la tabla
 * (etiqueta + badge) y los filtros del `DataTable`.
 *
 * Ninguno admite cadena vacía: los tres tienen default en el backend y el
 * formulario los envía SIEMPRE.
 */

export const TIPO_EVALUACION_VALUES = ["desempeno", "competencias", "objetivo"] as const;

export type TipoEvaluacion = (typeof TIPO_EVALUACION_VALUES)[number];

export const TIPO_EVALUACION_OPTIONS: { value: TipoEvaluacion; label: string }[] = [
  { value: "desempeno", label: "Desempeño" },
  { value: "competencias", label: "Competencias" },
  { value: "objetivo", label: "Por objetivos" },
];

export const PERIODO_EVALUACION_VALUES = ["trimestral", "semestral", "anual"] as const;

export type PeriodoEvaluacion = (typeof PERIODO_EVALUACION_VALUES)[number];

export const PERIODO_EVALUACION_OPTIONS: { value: PeriodoEvaluacion; label: string }[] = [
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export const ESTADO_EVALUACION_VALUES = ["pendiente", "completada"] as const;

export type EstadoEvaluacion = (typeof ESTADO_EVALUACION_VALUES)[number];

export const ESTADO_EVALUACION_OPTIONS: { value: EstadoEvaluacion; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "completada", label: "Completada" },
];

/**
 * Estado que exige `puntaje` y `evaluador` y es el ÚNICO donde `puntaje` se
 * captura. Una evaluación completada no vuelve a "Pendiente" en la UI y no se
 * puede eliminar.
 */
export const ESTADO_COMPLETADA: EstadoEvaluacion = "completada";

/**
 * Traducen el valor guardado a su etiqueta. Devuelven `null` cuando el backend
 * manda un valor fuera del catálogo, para que la tabla pinte el guion.
 */
export const getTipoEvaluacionLabel = (value: string | null | undefined) =>
  TIPO_EVALUACION_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const getPeriodoEvaluacionLabel = (value: string | null | undefined) =>
  PERIODO_EVALUACION_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const getEstadoEvaluacionLabel = (value: string | null | undefined) =>
  ESTADO_EVALUACION_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const ESTADO_EVALUACION_CFG: Record<EstadoEvaluacion, StatusBadgeConfigEntry> = {
  pendiente: {
    label: "Pendiente",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  completada: {
    label: "Completada",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};
