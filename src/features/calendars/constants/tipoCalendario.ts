/**
 * Catálogo de tipos de día del calendario laboral.
 *
 * Vive aquí y no a nivel de módulo dentro del formulario porque tiene DOS
 * consumidores: el `FormSelect` del alta/edición y la tabla, que traduce el
 * valor guardado a su etiqueta.
 *
 * La cadena vacía es un valor legítimo: `tipo` es opcional en el backend.
 */

export const TIPO_CALENDARIO_VALUES = [
  "",
  "laborable",
  "descanso",
  "festivo",
  "vacaciones",
] as const;

export type TipoCalendario = (typeof TIPO_CALENDARIO_VALUES)[number];

/** Opciones del select. La primera entrada es el "sin tipo". */
export const TIPO_OPTIONS: { value: TipoCalendario; label: string }[] = [
  { value: "", label: "Sin tipo" },
  { value: "laborable", label: "Laborable" },
  { value: "descanso", label: "Descanso" },
  { value: "festivo", label: "Festivo" },
  { value: "vacaciones", label: "Vacaciones" },
];

/**
 * Traduce el valor guardado a su etiqueta. Devuelve `null` cuando no hay valor
 * (o cuando el backend manda uno fuera del catálogo) para que `textOrDash` y
 * los fallbacks de la tabla pinten el guion.
 */
export const getTipoLabel = (value: string | null | undefined) =>
  TIPO_OPTIONS.find((option) => option.value !== "" && option.value === value)?.label ?? null;
