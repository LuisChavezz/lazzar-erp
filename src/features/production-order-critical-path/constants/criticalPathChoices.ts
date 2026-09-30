/**
 * Opciones de `estatus_paquete_tecnico`. Las etiquetas son las MISMAS que
 * devuelve el backend en `estatus_paquete_tecnico_display` (comprobadas contra
 * la API); si el backend las cambia, cámbialas aquí.
 */
export const ESTATUS_PAQUETE_TECNICO_OPTIONS = [
  { value: "actualizada", label: "Actualizada" },
  { value: "nueva", label: "Nueva" },
  { value: "espera_muestra", label: "En espera de muestra" },
] as const;

export type EstatusPaqueteTecnico = (typeof ESTATUS_PAQUETE_TECNICO_OPTIONS)[number]["value"];

export const ESTATUS_PAQUETE_TECNICO_VALUES = ESTATUS_PAQUETE_TECNICO_OPTIONS.map(
  (option) => option.value
) as [EstatusPaqueteTecnico, ...EstatusPaqueteTecnico[]];

/** Casillas de existencia, cada una con su sello de "último cambio". */
export const EXISTENCE_FIELDS = [
  { field: "existencia_tela", stamp: "fecha_existencia_tela", label: "Existencia de tela" },
  { field: "sin_existencia_tela", stamp: "fecha_sin_existencia_tela", label: "Sin existencia de tela" },
  { field: "existencia_avios", stamp: "fecha_existencia_avios", label: "Existencia de avíos" },
  { field: "sin_existencia_avios", stamp: "fecha_sin_existencia_avios", label: "Sin existencia de avíos" },
] as const;
