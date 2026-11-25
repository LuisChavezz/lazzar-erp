/**
 * Tope del motivo de una cancelación en nucleo-erp: los servicios lo recortan a
 * 500 (`motivo_de`, `[:500]`) en WMS (EC-945) y en Producción (nucleo-erp#1355).
 */
export const CANCEL_REASON_MAX = 500;
