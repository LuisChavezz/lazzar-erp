import type { StatusBadgeConfigEntry } from "@/src/components/StatusBadge";

/**
 * Catálogo de `tipo` del tramo de control de horas: el enum COMPLETO del
 * backend (`ControlHoras.tipo`, `normal` por defecto). No expone endpoint de
 * choices, así que vive aquí.
 */

export const TIPO_CONTROL_HORAS_VALUES = ["normal", "extra"] as const;

export type TipoControlHoras = (typeof TIPO_CONTROL_HORAS_VALUES)[number];

export const TIPO_NORMAL: TipoControlHoras = "normal";

export const TIPO_CONTROL_HORAS_CFG: Record<TipoControlHoras, StatusBadgeConfigEntry> = {
  normal: {
    label: "Normal",
    cls: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  extra: {
    label: "Extra",
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400",
    dot: "bg-violet-500",
  },
};

/** Opciones del selector: las etiquetas salen de `TIPO_CONTROL_HORAS_CFG`. */
export const TIPO_CONTROL_HORAS_OPTIONS: { value: TipoControlHoras; label: string }[] =
  TIPO_CONTROL_HORAS_VALUES.map((value) => ({
    value,
    label: TIPO_CONTROL_HORAS_CFG[value].label ?? value,
  }));

/**
 * Inconsistencias de un tramo YA GUARDADO. El backend no valida coherencia,
 * traslapes ni límites, así que un tramo creado por otra vía (o antes de que
 * cambiara la asistencia) puede tener cualquiera de estas. Solo se señalan: el
 * módulo nunca corrige un tramo por su cuenta.
 */
export type SegmentIssue = "sin_fin" | "horas_invalidas" | "fuera_de_jornada" | "traslape";

export const SEGMENT_ISSUE_LABELS: Record<SegmentIssue, string> = {
  sin_fin: "Sin hora de fin",
  horas_invalidas: "Horas inválidas",
  fuera_de_jornada: "Fuera de la jornada",
  traslape: "Se traslapa",
};
