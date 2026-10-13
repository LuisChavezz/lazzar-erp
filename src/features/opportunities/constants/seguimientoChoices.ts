/**
 * Catálogos de seguimientos de una oportunidad. Los valores son los CRUDOS del
 * backend (`ventas.OportunidadSeguimiento`): se envían y se comparan tal cual.
 */

export const TIPO_SEGUIMIENTO_VALUES = ["Nota", "Llamada", "Correo", "Visita", "Tarea"] as const;
export type TipoSeguimiento = (typeof TIPO_SEGUIMIENTO_VALUES)[number];

/** El tipo con el que nace un seguimiento (también el default del backend). */
export const TIPO_SEGUIMIENTO_DEFAULT: TipoSeguimiento = "Nota";

export const TIPO_SEGUIMIENTO_OPTIONS: { value: TipoSeguimiento; label: string }[] =
  TIPO_SEGUIMIENTO_VALUES.map((value) => ({ value, label: value }));
