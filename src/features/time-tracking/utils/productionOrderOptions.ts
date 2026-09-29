import type { ProductionOrderListItem } from "@/src/features/production-orders/interfaces/production-order.interface";

/**
 * Selector y etiquetas de OP del desglose. Solo se usa el entero
 * `estatus_op`; `activo` no sirve como filtro (el backend lo deja siempre en
 * `true`).
 */

/** `estatus_op` de una OP cancelada: no se ofrece al dar de alta. */
export const ESTATUS_OP_CANCELADA = 7;

export const SIN_OP_LABEL = "Sin OP";

export interface OpOption {
  /** `op_id` como string, o "" para "Sin OP". */
  value: string;
  label: string;
}

export const indexOrders = (orders: readonly ProductionOrderListItem[]) =>
  new Map(orders.map((order) => [order.op_id, order]));

/**
 * Etiqueta de una OP guardada: su folio, con "(cancelada)" si lo está. Si no
 * aparece en el catálogo, `OP #<id>` (o "…" mientras el catálogo carga).
 */
export const getOpLabel = (
  opId: number,
  orderById: Map<number, ProductionOrderListItem>,
  catalogLoaded: boolean
): string => {
  const order = orderById.get(opId);
  if (!order) {
    return catalogLoaded ? `OP #${opId}` : "…";
  }
  return order.estatus_op === ESTATUS_OP_CANCELADA ? `${order.folio_op} (cancelada)` : order.folio_op;
};

/**
 * Opciones del selector de OP: "Sin OP" y todas las OP no canceladas por
 * folio, las más recientes primero. Al editar, la OP guardada se conserva
 * SIEMPRE (arriba, con su estatus si está cancelada, o `OP #<id>` si el
 * catálogo no la trae), aunque ya no se ofrezca para un alta.
 */
export const buildOpOptions = (
  orders: readonly ProductionOrderListItem[],
  currentOpId: number | null,
  catalogLoaded: boolean
): OpOption[] => {
  const options: OpOption[] = orders
    .filter((order) => order.estatus_op !== ESTATUS_OP_CANCELADA)
    .map((order) => ({ value: String(order.op_id), label: order.folio_op }))
    .sort((a, b) => b.label.localeCompare(a.label, "es-MX", { numeric: true }));

  if (currentOpId !== null && !options.some((option) => option.value === String(currentOpId))) {
    options.unshift({
      value: String(currentOpId),
      label: getOpLabel(currentOpId, indexOrders(orders), catalogLoaded),
    });
  }
  return [{ value: "", label: SIN_OP_LABEL }, ...options];
};
