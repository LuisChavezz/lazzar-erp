import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPedidoDetail, searchOrders } from "@/src/features/orders/services/actions";
import { linkedPedidoAvailabilityQueryKey } from "@/src/features/orders/constants/ordersQueryKeys";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import type { PedidoVinculado } from "../interfaces/purchase-order.interface";
import {
  linkedPedidoLookupFromDetailError,
  linkedPedidoLookupFromPage,
  linkedPedidoLookupFromRow,
  type LinkedPedidoLookup,
} from "../utils/linkedPedidoAvailability";

/** Coincidencias de un folio que se piden: el folio es casi único, sobra margen. */
const FOLIO_LOOKUP_LIMIT = 5;

const fetchLookup = async (
  queryClient: QueryClient,
  { id, folio }: PedidoVinculado,
): Promise<LinkedPedidoLookup> => {
  if (folio) {
    // Sin `?estatus=`: el cancelado tiene que venir para poder decirlo.
    const page = await searchOrders({ folio, limit: FOLIO_LOOKUP_LIMIT });
    return linkedPedidoLookupFromPage(id, page);
  }
  // Sin folio no hay por qué buscarlo en el listado: se lee su detalle, a
  // través de la MISMA caché que `usePedidoDetail` (si ya se leyó, no se
  // vuelve a descargar).
  try {
    const detail = await queryClient.ensureQueryData({
      queryKey: pedidoDetailQueryKey(id),
      queryFn: () => getPedidoDetail(id),
      // Un 404/403 ya es la respuesta (no disponible): reintentarlo solo
      // retrasa el aviso y repite una descarga pesada.
      retry: retryUnlessClientError,
    });
    return linkedPedidoLookupFromRow(detail);
  } catch (error) {
    const lookup = linkedPedidoLookupFromDetailError(error);
    if (lookup) return lookup;
    throw error;
  }
};

/**
 * Estado de UN pedido ya ligado a la orden de compra que se edita: si se
 * canceló o se dio de baja desde que se ligó, y su cliente. La búsqueda del
 * selector no sirve para esto: pide solo pedidos ligables, así que un
 * cancelado nunca viene en ella y su ausencia no dice nada.
 *
 * Una petición ligera por ligado (`?folio=&limit=5`, una fila del listado; una
 * OC suele tener de 1 a 3). Cuelga del prefijo `["orders"]`, así que cancelar
 * un pedido la refresca.
 *
 * - `availability`: mientras carga, `"unknown"` (no se acusa a un pedido
 *   válido).
 * - `isUnverified`: la consulta falló y nunca cargó (5xx o red, ya
 *   reintentada): el renglón no puede pasar por válido, así que lo dice.
 */
export const useLinkedPedidoAvailability = (pedido: PedidoVinculado) => {
  const queryClient = useQueryClient();
  const { data, isInitialError } = useGuardedQuery(
    {
      queryKey: linkedPedidoAvailabilityQueryKey(pedido.id, pedido.folio),
      queryFn: () => fetchLookup(queryClient, pedido),
      retry: retryUnlessClientError,
    },
    // Sin toast: el fallo se dice en el propio renglón (`isUnverified`).
    { toastId: "linked-pedido-availability-refetch-error", silent: true },
  );
  return {
    availability: data?.availability ?? "unknown",
    cliente: data?.cliente ?? null,
    isUnverified: isInitialError,
  };
};
