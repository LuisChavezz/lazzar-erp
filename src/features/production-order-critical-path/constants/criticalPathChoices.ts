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

/**
 * Casillas de existencia, cada una con su sello de "último cambio" (se vuelve
 * a sellar también al desmarcar). `kit_completo` NO va aquí: su sello
 * (`fecha_kit_completo`) se limpia al desmarcar y se rotula distinto.
 */
export const EXISTENCE_FIELDS = [
  { field: "existencia_tela", stamp: "fecha_existencia_tela", label: "Existencia de tela" },
  { field: "sin_existencia_tela", stamp: "fecha_sin_existencia_tela", label: "Sin existencia de tela" },
  { field: "existencia_avios", stamp: "fecha_existencia_avios", label: "Existencia de avíos" },
  { field: "sin_existencia_avios", stamp: "fecha_sin_existencia_avios", label: "Sin existencia de avíos" },
] as const;

/**
 * Aviso de solo lectura de una OP cerrada. QUÉ estatus cierran la OP lo decide
 * `isClosedProductionOrderStatus` (production-orders); aquí solo vive la
 * redacción, en femenino porque nombra a la orden. Sin estatus conocido —la OP
 * se cerró con el diálogo abierto y solo se sabe por el 409, o un estatus de
 * cierre nuevo sin etiqueta aquí— el texto no afirma cuál de los dos es.
 */
const CLOSED_OP_NOTICE_LABELS: Partial<Record<number, string>> = {
  5: "completada",
  7: "cancelada",
};

export const closedOpNotice = (estatusOp?: number): string => {
  const label =
    (estatusOp !== undefined && CLOSED_OP_NOTICE_LABELS[estatusOp]) || "completada o cancelada";
  return `La ruta crítica no se puede editar porque la orden de producción está ${label}. Solo se puede consultar.`;
};
