import type { ProductionOrderPedidoRef } from "../interfaces/production-order.interface";

/**
 * Pedidos de una OP para mostrarse: `pedidos` del backend con el principal
 * (`pedido`) primero y sin repetidos.
 *
 * Devuelve `null` cuando `pedidos` no viene o viene vacío: entonces quien lo
 * llama muestra el pedido único de siempre (`pedido`/`pedido_folio`), así una
 * respuesta sin el campo nuevo se ve igual que antes. El backend ya ordena el
 * principal primero; aquí se reafirma por si una OP quedó con el principal
 * fuera de su lista.
 */
export function opPedidoRefs(
  pedidos: ProductionOrderPedidoRef[] | null | undefined,
  principalId: number | null | undefined,
): ProductionOrderPedidoRef[] | null {
  if (!pedidos?.length) return null;
  const vistos = new Set<number>();
  const unicos = pedidos.filter((p) => {
    if (vistos.has(p.id)) return false;
    vistos.add(p.id);
    return true;
  });
  const principal = unicos.filter((p) => p.id === principalId);
  return [...principal, ...unicos.filter((p) => p.id !== principalId)];
}

/** Texto de un folio de pedido: `Pedido #id` si aún no tiene folio. */
export const pedidoRefLabel = (pedido: ProductionOrderPedidoRef) =>
  pedido.folio || `Pedido #${pedido.id}`;
