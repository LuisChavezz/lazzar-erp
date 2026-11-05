import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPedidoDetail, searchOrders } from "@/src/features/orders/services/actions";
import { linkedPedidoAvailabilityQueryKey } from "@/src/features/orders/constants/ordersQueryKeys";
import type { PedidoVinculado } from "../interfaces/purchase-order.interface";
import {
  isLinkablePedidoRow,
  linkedPedidoAvailabilityFromPage,
  type LinkedPedidoAvailability,
} from "../utils/linkedPedidoAvailability";

/** Coincidencias de un folio que se piden: el folio es casi único, sobra margen. */
const FOLIO_LOOKUP_LIMIT = 5;

const fetchAvailability = async ({ id, folio }: PedidoVinculado): Promise<LinkedPedidoAvailability> => {
  if (folio) {
    // Sin `?estatus=`: el cancelado tiene que venir para poder decirlo.
    const page = await searchOrders({ folio, limit: FOLIO_LOOKUP_LIMIT });
    return linkedPedidoAvailabilityFromPage(id, page);
  }
  // Sin folio no hay por qué buscarlo en el listado: se lee su detalle. El
  // detalle de un pedido inactivo o ajeno es 404, igual de "no disponible".
  try {
    return isLinkablePedidoRow(await getPedidoDetail(id)) ? "available" : "unavailable";
  } catch (error) {
    if (isNotFoundError(error)) return "unavailable";
    throw error;
  }
};

/**
 * Disponibilidad de UN pedido ya ligado a la orden de compra que se edita, para
 * avisar si se canceló o se dio de baja desde que se ligó. La búsqueda del
 * selector no sirve para esto: pide solo pedidos ligables, así que un
 * cancelado nunca viene en ella y su ausencia no dice nada.
 *
 * Una petición ligera por ligado (`?folio=&limit=5`, una fila del listado;
 * una OC suele tener de 1 a 3). Mientras carga, o si falla, es `"unknown"`: no
 * se acusa a un pedido válido. Cuelga del prefijo `["orders"]`, así que
 * cancelar un pedido la refresca.
 */
export const useLinkedPedidoAvailability = (pedido: PedidoVinculado): LinkedPedidoAvailability => {
  const { data } = useGuardedQuery(
    {
      queryKey: linkedPedidoAvailabilityQueryKey(pedido.id, pedido.folio),
      queryFn: () => fetchAvailability(pedido),
      retry: retryUnlessClientError,
    },
    // Sin toast: el aviso es secundario y, sin respuesta, el renglón se pinta
    // como siempre.
    { toastId: "linked-pedido-availability-refetch-error", silent: true },
  );
  return data ?? "unknown";
};
