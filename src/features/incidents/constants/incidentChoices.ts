import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogos de `tipo`, `gravedad` y `estado` de la incidencia.
 *
 * Viven aquí y no dentro del formulario porque tienen TRES consumidores: los
 * `FormSelect` del alta/edición, la tabla (etiqueta + badge) y los filtros del
 * `DataTable`.
 *
 * Ninguno admite cadena vacía: los tres tienen default en el backend y el
 * formulario los envía SIEMPRE.
 */

export const TIPO_INCIDENCIA_VALUES = ["retardo", "falta", "actitud", "otro"] as const;

export type TipoIncidencia = (typeof TIPO_INCIDENCIA_VALUES)[number];

export const TIPO_INCIDENCIA_OPTIONS: { value: TipoIncidencia; label: string }[] = [
  { value: "retardo", label: "Retardo" },
  { value: "falta", label: "Falta" },
  { value: "actitud", label: "Actitud" },
  { value: "otro", label: "Otro" },
];

export const GRAVEDAD_INCIDENCIA_VALUES = ["baja", "media", "alta"] as const;

export type GravedadIncidencia = (typeof GRAVEDAD_INCIDENCIA_VALUES)[number];

export const GRAVEDAD_INCIDENCIA_OPTIONS: { value: GravedadIncidencia; label: string }[] = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
];

export const ESTADO_INCIDENCIA_VALUES = ["abierto", "cerrado"] as const;

export type EstadoIncidencia = (typeof ESTADO_INCIDENCIA_VALUES)[number];

export const ESTADO_INCIDENCIA_OPTIONS: { value: EstadoIncidencia; label: string }[] = [
  { value: "abierto", label: "Abierto" },
  { value: "cerrado", label: "Cerrado" },
];

/**
 * Estado en el que `acciones_tomadas` es obligatoria (ver
 * `getAccionesTomadasError`). Fuera de él es opcional, y NUNCA se anula: al
 * reabrir, el texto capturado se conserva y se envía tal cual.
 */
export const ESTADO_QUE_EXIGE_ACCIONES: EstadoIncidencia = "cerrado";

/**
 * Traducen el valor guardado a su etiqueta. Devuelven `null` cuando el backend
 * manda un valor fuera del catálogo, para que la tabla pinte el guion.
 */
export const getTipoIncidenciaLabel = (value: string | null | undefined) =>
  TIPO_INCIDENCIA_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const getGravedadIncidenciaLabel = (value: string | null | undefined) =>
  GRAVEDAD_INCIDENCIA_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const getEstadoIncidenciaLabel = (value: string | null | undefined) =>
  ESTADO_INCIDENCIA_OPTIONS.find((option) => option.value === value)?.label ?? null;

/**
 * Peso de severidad para ordenar la columna "Gravedad". Sin esto el sort es
 * alfabético sobre el string crudo (alta → baja → media), que mezcla la más
 * grave con la menos. El backend también la ordena alfabéticamente.
 */
const GRAVEDAD_INCIDENCIA_RANK: Record<GravedadIncidencia, number> = {
  baja: 1,
  media: 2,
  alta: 3,
};

/**
 * Peso de una gravedad, con degradación explícita a 0 ante un valor fuera del
 * enum: indexar el mapa a secas devolvería `undefined`, el comparador daría
 * `NaN` y toda la columna quedaría en un orden arbitrario. Mismo criterio que
 * `pickingPrioridadRank`.
 */
export const gravedadIncidenciaRank = (gravedad: string): number =>
  GRAVEDAD_INCIDENCIA_RANK[gravedad as GravedadIncidencia] ?? 0;

export const TIPO_INCIDENCIA_CFG: Record<TipoIncidencia, StatusBadgeConfigEntry> = {
  retardo: {
    label: "Retardo",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  falta: {
    label: "Falta",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  actitud: {
    label: "Actitud",
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  otro: {
    label: "Otro",
    cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

export const GRAVEDAD_INCIDENCIA_CFG: Record<GravedadIncidencia, StatusBadgeConfigEntry> = {
  baja: {
    label: "Baja",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  media: {
    label: "Media",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  alta: {
    label: "Alta",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
};

export const ESTADO_INCIDENCIA_CFG: Record<EstadoIncidencia, StatusBadgeConfigEntry> = {
  abierto: {
    label: "Abierto",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  cerrado: {
    label: "Cerrado",
    cls: "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};
