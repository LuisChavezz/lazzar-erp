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

/**
 * Pedidos de una fila del listado de OP, ya con el respaldo del pedido único:
 * `opPedidoRefs` o, sin `pedidos`, `pedido`/`pedido_folio`; `[]` sin pedido.
 * Se calcula una vez por fila (caché por objeto): lo leen el accessor de la
 * columna y su celda.
 */
const listRefsCache = new WeakMap<object, ProductionOrderPedidoRef[]>();

export function opListPedidoRefs(row: {
  pedidos?: ProductionOrderPedidoRef[];
  pedido: number | null;
  pedido_folio?: string | null;
}): ProductionOrderPedidoRef[] {
  const cached = listRefsCache.get(row);
  if (cached) return cached;
  const refs =
    opPedidoRefs(row.pedidos, row.pedido) ??
    (row.pedido == null ? [] : [{ id: row.pedido, folio: row.pedido_folio ?? null }]);
  listRefsCache.set(row, refs);
  return refs;
}

/** Texto de un folio de pedido: `Pedido #id` si aún no tiene folio. */
export const pedidoRefLabel = (pedido: ProductionOrderPedidoRef) =>
  pedido.folio || `Pedido #${pedido.id}`;
