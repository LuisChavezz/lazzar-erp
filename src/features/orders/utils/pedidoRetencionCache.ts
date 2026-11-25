import type { QueryClient } from "@tanstack/react-query";
import { mergeCachedRecord, patchCachedRowById, pickPresentFields } from "@/src/utils/cachedRows";
import { ORDERS_QUERY_KEY } from "../constants/ordersQueryKeys";
import { pedidoDetailQueryKey } from "../hooks/usePedidoDetail";
import type { PedidoListItem, PedidoRetencion } from "../interfaces/order.interface";
import type { PedidoRetencionResponse } from "../interfaces/pedido-retencion.interface";
import { PEDIDO_RETENCION_DETAIL_FIELDS, PEDIDO_RETENCION_LIST_FIELDS } from "./pedidoRetencion";

/**
 * Escribe el estado de retención que respondió el backend (`retener/` o
 * `liberar/`) en la caché ANTES de invalidar (EC-927): en cada variante del
 * listado bajo `["orders"]` que tenga la fila (arreglo plano o página
 * `{ results }`) y en el detalle del pedido si está en caché. Así, si el
 * refetch que sigue falla, la fila no se queda ofreciendo la acción contraria.
 * Best-effort (`cachedRows`): una respuesta de otro pedido o de otra forma no
 * escribe nada.
 */
export const applyPedidoRetencionResult = async (
  queryClient: QueryClient,
  pedidoId: number,
  response: PedidoRetencionResponse,
) => {
  if (response?.id !== pedidoId) return;
  const listFields = pickPresentFields<PedidoListItem>(response, PEDIDO_RETENCION_LIST_FIELDS);
  await patchCachedRowById<PedidoListItem>(queryClient, ORDERS_QUERY_KEY, pedidoId, (row) => ({
    ...row,
    ...listFields,
  }));
  await mergeCachedRecord(
    queryClient,
    pedidoDetailQueryKey(pedidoId),
    pedidoId,
    pickPresentFields<PedidoRetencion>(response, PEDIDO_RETENCION_DETAIL_FIELDS),
  );
};
