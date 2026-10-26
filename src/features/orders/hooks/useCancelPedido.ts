"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Query, QueryClient, QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { drfActionErrorMessage, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { cancelPedido } from "../services/actions";
import type { PedidoCancelResponse } from "../interfaces/pedido-cancel.interface";
import { PEDIDO_KPIS_QUERY_KEY } from "../constants/pedidoKpis";
import { ordersQueryKey } from "./useOrders";
import { orderStockDetailQueryKey } from "./useOrderStockDetail";
import { pedidoDetailQueryKey } from "./usePedidoDetail";
import { pedidoMesaControlContextoQueryKey } from "./usePedidoMesaControlContexto";
import { pedidoTrazabilidadQueryKey } from "./usePedidoTrazabilidad";

/** Candado de la cancelación, ÚNICO por pedido (ver `useCancelPedido`). */
export const cancelPedidoMutationKey = (pedidoId: number) =>
  ["cancel-pedido", pedidoId] as const;

/**
 * Consultas de UN pedido que, tras cancelarlo, responderían 404: el backend lo
 * da de baja (`activo = false`) y ninguna de sus rutas de detalle lo encuentra.
 */
const pedidoRecordQueryKeys = (pedidoId: number): QueryKey[] => [
  pedidoDetailQueryKey(pedidoId),
  pedidoTrazabilidadQueryKey(pedidoId),
  orderStockDetailQueryKey(pedidoId),
  pedidoMesaControlContextoQueryKey(pedidoId),
];

/**
 * Saca de la caché las consultas de `queryKeys`. Las que nadie observa se
 * quitan ya; las que tienen observadores (el detalle 360° abierto, el título
 * del encabezado) se quitan cuando se va el ÚLTIMO.
 *
 * No se quitan de inmediato porque un observador montado sobre una llave
 * quitada crea otra consulta vacía en su siguiente render y la pide: justo el
 * 404 que se quiere evitar. Tampoco se invalidan, por lo mismo. Mientras
 * siguen montadas conservan el último dato y no se piden (sin `staleTime`
 * vencido ni foco de ventana que las dispare).
 */
const dropQueriesWhenUnobserved = (queryClient: QueryClient, queryKeys: QueryKey[]) => {
  const queryCache = queryClient.getQueryCache();
  const watched = new Set<Query>();
  for (const queryKey of queryKeys) {
    for (const query of queryCache.findAll({ queryKey, exact: true })) {
      if (query.getObserversCount() === 0) queryCache.remove(query);
      else watched.add(query);
    }
  }
  if (watched.size === 0) return;

  const unsubscribe = queryCache.subscribe((event) => {
    if (event.type !== "observerRemoved" || !watched.has(event.query)) return;
    if (event.query.getObserversCount() > 0) return;
    watched.delete(event.query);
    queryCache.remove(event.query);
    if (watched.size === 0) unsubscribe();
  });
};

const cancelPedidoErrorMessage = (error: unknown): string =>
  drfActionErrorMessage(
    error,
    "No se pudo cancelar el pedido. Intenta de nuevo.",
    "El pedido ya no está disponible; puede que ya se haya cancelado.",
  );

/**
 * Cancela UN pedido (`POST /ventas/pedidos/{id}/cancelar/`). Sin optimismo: la
 * fila sale del listado solo cuando el backend lo confirma.
 *
 * Candado contra el doble envío: la mutación misma, con `mutationKey` POR
 * PEDIDO (`useMutationLock`), el mismo para el diálogo de Mesa de Control y el
 * del detalle 360°.
 *
 * Al cancelarse, el pedido queda con `activo = false`: deja de listarse y su
 * detalle responde 404. Por eso sus consultas propias (detalle, trazabilidad,
 * existencias, contexto de edición) se CANCELAN y se sacan de la caché en vez
 * de invalidarse (`dropQueriesWhenUnobserved`). Se invalidan los listados
 * (`["orders"]` por prefijo: Mesa de Control, Programados, Mis pedidos y los
 * selectores de otros módulos), los indicadores de "Mis pedidos" y los pedidos
 * especiales. La mutación sigue "pending" hasta que los listados montados se
 * releen, así que el diálogo se cierra con la fila ya fuera.
 *
 * Errores: el mensaje del backend tal cual (`pedido` con los documentos vivos,
 * `permiso`, `estatus`), en un toast. Esos 400 no cambian nada. Un 404 (otra
 * sesión ya lo canceló) relee los listados para que la fila desaparezca.
 */
export const useCancelPedido = (pedidoId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = cancelPedidoMutationKey(pedidoId);
  const { isRunning: isCancelling, isIdle } = useMutationLock(mutationKey);

  const mutation = useMutation<PedidoCancelResponse, unknown, string>({
    mutationKey,
    mutationFn: () => cancelPedido(pedidoId),
    onSuccess: async (_response, label) => {
      const recordKeys = pedidoRecordQueryKeys(pedidoId);
      await Promise.all(
        recordKeys.map((queryKey) => queryClient.cancelQueries({ queryKey, exact: true })),
      );
      dropQueriesWhenUnobserved(queryClient, recordKeys);
      toast.success(`Pedido ${label} cancelado`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ordersQueryKey() }),
        queryClient.invalidateQueries({ queryKey: PEDIDO_KPIS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ["special-orders"] }),
      ]);
    },
    onError: (error) => {
      toast.error(cancelPedidoErrorMessage(error));
      if (isNotFoundError(error)) {
        queryClient.invalidateQueries({ queryKey: ordersQueryKey() });
      }
    },
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTE pedido
   * (consulta síncrona a la caché). `label` es el folio para el toast.
   * `onSuccess` corre tras cancelar (y releer los listados); `onSettled`, con
   * cualquier resultado.
   */
  const cancel = (
    label: string,
    options: { onSuccess?: () => void; onSettled?: () => void } = {},
  ) => {
    if (!isIdle()) return;
    mutation.mutate(label, options);
  };

  return { cancel, isCancelling };
};
