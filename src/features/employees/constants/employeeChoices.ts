/**
 * Catálogos cerrados de `sexo` y `estado_civil`.
 *
 * Viven aquí y no a nivel de módulo dentro del formulario —como
 * `PRIORIDAD_OPTIONS` en corte-manga— porque tienen DOS consumidores: el
 * `FormSelect` del alta/edición y el detalle, que necesita traducir el valor
 * guardado a su etiqueta. Duplicar las etiquetas sería el problema que el
 * propio comentario de `PRIORIDAD_OPTIONS` advierte: capturar una cosa y
 * rotular otra.
 *
 * La cadena vacía es un valor legítimo ("sin especificar"): ambos campos son
 * opcionales en el backend.
 */

export const SEXO_VALUES = ["", "M", "F", "NB"] as const;

export const ESTADO_CIVIL_VALUES = [
  "",
  "soltero",
  "casado",
  "divorciado",
  "viudo",
  "union_libre",
] as const;

export type Sexo = (typeof SEXO_VALUES)[number];
export type EstadoCivil = (typeof ESTADO_CIVIL_VALUES)[number];

/** Opciones del select. La primera entrada es el "sin seleccionar". */
export const SEXO_OPTIONS: { value: Sexo; label: string }[] = [
  { value: "", label: "Sin especificar" },
  { value: "M", label: "Masculino" },
  { value: "F", label: "Femenino" },
  { value: "NB", label: "No binario" },
];

export const ESTADO_CIVIL_OPTIONS: { value: EstadoCivil; label: string }[] = [
  { value: "", label: "Sin especificar" },
  { value: "soltero", label: "Soltero" },
  { value: "casado", label: "Casado" },
  { value: "divorciado", label: "Divorciado" },
  { value: "viudo", label: "Viudo" },
  { value: "union_libre", label: "Unión libre" },
];

/**
 * Traduce el valor guardado a su etiqueta para el detalle. Devuelve `null`
 * cuando no hay valor (o cuando el backend manda uno fuera del catálogo) para
 * que `textOrDash` pinte el guion.
 */
export const getSexoLabel = (value: string | null | undefined) =>
  SEXO_OPTIONS.find((option) => option.value !== "" && option.value === value)?.label ?? null;

export const getEstadoCivilLabel = (value: string | null | undefined) =>
  ESTADO_CIVIL_OPTIONS.find((option) => option.value !== "" && option.value === value)?.label ??
  null;
