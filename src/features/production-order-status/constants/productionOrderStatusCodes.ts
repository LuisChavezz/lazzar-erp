/**
 * Códigos de `estatus_op` que la UI de cambio de estatus trata aparte. Las
 * etiquetas y colores siguen saliendo de `productionOrderStatus.ts`.
 */
export const PRODUCTION_ORDER_STATUS_COMPLETED = 5;
export const PRODUCTION_ORDER_STATUS_STOPPED = 6;
export const PRODUCTION_ORDER_STATUS_CANCELLED = 7;

/**
 * Destinos que piden motivo aunque la opción no lo marcara (`requiere_motivo`
 * es la fuente; esto es la red por si el backend lo omitiera).
 */
export const MOTIVO_REQUIRED_STATUSES: readonly number[] = [
  PRODUCTION_ORDER_STATUS_STOPPED,
  PRODUCTION_ORDER_STATUS_CANCELLED,
];
