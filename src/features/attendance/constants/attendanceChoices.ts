import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogo de `estado` del registro de asistencia. Es el enum COMPLETO del
 * backend (`Asistencia.ESTADO_CHOICES`); no expone endpoint de choices, así que
 * vive aquí.
 *
 * El servidor lo DERIVA en cada guardado; el cliente solo lo envía para
 * justificar o quitar la justificación (`D-RH`). Ninguna otra escritura lo
 * lleva: corregir horas conserva el estado guardado.
 */

export const ESTADO_ASISTENCIA_VALUES = ["puntual", "retardo", "falta", "justificada"] as const;

export type EstadoAsistencia = (typeof ESTADO_ASISTENCIA_VALUES)[number];

export const ESTADO_PUNTUAL: EstadoAsistencia = "puntual";
export const ESTADO_RETARDO: EstadoAsistencia = "retardo";
export const ESTADO_FALTA: EstadoAsistencia = "falta";
export const ESTADO_JUSTIFICADA: EstadoAsistencia = "justificada";

/**
 * Valor que se envía para QUITAR una justificación. El servidor reemplaza
 * cualquier valor distinto de `justificada` por el que deriva de las horas
 * (`puntual`, `retardo` o `falta`), así que el valor concreto no decide el
 * resultado. Se manda `falta` porque es el mismo que usa el propio backend al
 * liberar una justificación en `registrar_entrada` (`_poner_entrada`), y
 * porque es el único que no afirmaría nada falso si la derivación no se
 * aplicara: sin evidencia de entrada, el registro es una falta.
 */
export const ESTADO_AL_QUITAR_JUSTIFICACION: EstadoAsistencia = ESTADO_FALTA;

/**
 * Estados que se pueden justificar. `puntual` no tiene nada que justificar;
 * `justificada` ya lo está (se ofrece "Quitar justificación").
 */
export const ESTADOS_JUSTIFICABLES: readonly EstadoAsistencia[] = [ESTADO_FALTA, ESTADO_RETARDO];

export const ESTADO_ASISTENCIA_OPTIONS: { value: EstadoAsistencia; label: string }[] = [
  { value: "puntual", label: "Puntual" },
  { value: "retardo", label: "Retardo" },
  { value: "falta", label: "Falta" },
  { value: "justificada", label: "Justificada" },
];

/** Etiqueta del estado, o `null` si el backend manda un valor fuera del catálogo. */
export const getEstadoAsistenciaLabel = (value: string | null | undefined) =>
  ESTADO_ASISTENCIA_OPTIONS.find((option) => option.value === value)?.label ?? null;

export const ESTADO_ASISTENCIA_CFG: Record<EstadoAsistencia, StatusBadgeConfigEntry> = {
  puntual: {
    label: "Puntual",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  retardo: {
    label: "Retardo",
    cls: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  falta: {
    label: "Falta",
    cls: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
    dot: "bg-red-500",
  },
  justificada: {
    label: "Justificada",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
};

/**
 * Pseudo-estado del PASE DE LISTA para el empleado que aún no tiene registro
 * ese día. No existe en el backend: nunca se envía.
 */
export const SIN_REGISTRO = "sin_registro";

export const SIN_REGISTRO_LABEL = "Sin registro";

export const SIN_REGISTRO_CFG: Record<typeof SIN_REGISTRO, StatusBadgeConfigEntry> = {
  sin_registro: {
    label: SIN_REGISTRO_LABEL,
    cls: "bg-slate-50 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400",
    dot: "bg-slate-400",
  },
};
