"use client";

import { PEDIDO_PROGRAMAR_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPedidoProgramarContexto } from "../services/actions";
import type { PedidoProgramarContexto } from "../interfaces/pedido-programacion.interface";

/**
 * Llave de "Programar pedido". Fuera del prefijo `["pedido-detail"]`: su
 * prefijo vive en `stockQueryKeys` para que `invalidateStockQueries` la relea
 * tras cualquier movimiento de inventario. Las mutaciones que cambian el pedido
 * (programar, editar en Mesa de Control, vincular SKU de muestra, avance) la
 * invalidan por su cuenta.
 */
export const pedidoProgramarQueryKey = (pedidoId: number) =>
  [...PEDIDO_PROGRAMAR_QUERY_KEY, pedidoId] as const;

/**
 * Contexto de "Programar pedido" (`GET /ventas/pedidos/{id}/programar/`).
 *
 * `refetchOnMount: "always"` + `isFetchedAfterMount`: el guardado REEMPLAZA la
 * lista entera, así que el diálogo solo monta el formulario con datos leídos
 * en ESTA apertura, nunca con la caché de una apertura anterior (borraría en
 * silencio lo que otro usuario programó mientras tanto).
 *
 * El 404 (pedido dado de baja o de otra empresa) es definitivo. El 400 de
 * permiso tampoco se reintenta (`retryUnlessClientError`) y llega como
 * `isInitialError` + `error`. Un refetch fallido con datos (una invalidación
 * con el diálogo abierto) conserva el formulario y avisa por toast.
 */
export const usePedidoProgramarContexto = (pedidoId: number) => {
  const { data, isInitialError, isDefinitiveError, isFetchedAfterMount, error } =
    useGuardedQuery<PedidoProgramarContexto>(
      {
        queryKey: pedidoProgramarQueryKey(pedidoId),
        queryFn: () => getPedidoProgramarContexto(pedidoId),
        enabled: pedidoId > 0,
        retry: retryUnlessClientError,
        refetchOnMount: "always",
      },
      {
        toastId: "pedido-programar-refetch-error",
        errorMessage: "No se pudo actualizar la programación del pedido. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundError,
      },
    );

  return { data, isInitialError, isNotFound: isDefinitiveError, isFetchedAfterMount, error };
};
