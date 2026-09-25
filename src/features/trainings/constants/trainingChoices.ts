import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogo de `estado` de la capacitación.
 *
 * Vive aquí y no dentro del formulario porque tiene TRES consumidores: el
 * `FormSelect` del alta/edición, la tabla (etiqueta + badge) y el filtro por
 * estado del `DataTable`.
 *
 * No admite cadena vacía: el backend tiene default (`inscrito`) y el formulario
 * lo envía SIEMPRE.
 */

export const ESTADO_CAPACITACION_VALUES = [
  "inscrito",
  "en_curso",
  "finalizado",
  "cancelado",
] as const;

export type EstadoCapacitacion = (typeof ESTADO_CAPACITACION_VALUES)[number];

export const ESTADO_CAPACITACION_OPTIONS: { value: EstadoCapacitacion; label: string }[] = [
  { value: "inscrito", label: "Inscrito" },
  { value: "en_curso", label: "En curso" },
  { value: "finalizado", label: "Finalizado" },
  { value: "cancelado", label: "Cancelado" },
];

/**
 * Único estado en el que se capturan `calificacion` y `constancia_url`. En
 * cualquier otro, ambos viajan como `null` (ver `useTrainingForm`).
 */
export const ESTADO_CON_RESULTADO: EstadoCapacitacion = "finalizado";

/**
 * Traduce el valor guardado a su etiqueta. Devuelve `null` cuando el backend
 * manda un valor fuera del catálogo, para que la tabla pinte el guion.
 */
export const getEstadoCapacitacionLabel = (value: string | null | undefined) =>
  ESTADO_CAPACITACION_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const ESTADO_CAPACITACION_CFG: Record<EstadoCapacitacion, StatusBadgeConfigEntry> = {
  inscrito: {
    label: "Inscrito",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  en_curso: {
    label: "En curso",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  finalizado: {
    label: "Finalizado",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  cancelado: {
    label: "Cancelado",
    cls: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};
