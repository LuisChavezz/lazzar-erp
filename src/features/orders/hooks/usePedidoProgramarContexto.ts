"use client";

import { useQueryClient } from "@tanstack/react-query";
import { PEDIDO_PROGRAMAR_QUERY_KEY } from "@/src/constants/stockQueryKeys";
import { useGuardedQuery } from "@/src/hooks/useGuardedQuery";
import { isNotFoundError } from "@/src/utils/drfWriteErrors";
import { retryUnlessClientError } from "@/src/utils/retryUnlessClientError";
import { getPedidoProgramarContexto } from "../services/actions";
import { withStaleProgramarRowRefresh } from "../utils/pedidoProgramarErrors";
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
 * `refetchOnMount: "always"` + `gcTime: 0` + `isFetchedAfterMount`: el
 * guardado REEMPLAZA la lista entera, así que el diálogo solo monta el
 * formulario con datos leídos en ESTA apertura. Sin caché que sobreviva al
 * cierre, una lectura fallida al reabrir es un error INICIAL (estado de
 * error), nunca "datos anteriores" de otra apertura (borraría en silencio lo
 * que otro usuario programó mientras tanto).
 *
 * El 404 (pedido dado de baja o de otra empresa) es definitivo. El 400 de
 * permiso tampoco se reintenta (`retryUnlessClientError`) y llega como
 * `isInitialError` + `error`. Un refetch fallido con datos (una invalidación
 * con el diálogo abierto) conserva el formulario y avisa por toast.
 *
 * Un 404 o un 400 de pedido no programable dicen que la fila que ofreció
 * "Programar" estaba desactualizada: el `queryFn` relee los listados de
 * pedidos (`withStaleProgramarRowRefresh`, EC-781).
 */
export const usePedidoProgramarContexto = (pedidoId: number) => {
  const queryClient = useQueryClient();
  const { data, isInitialError, isDefinitiveError, isFetchedAfterMount, error } =
    useGuardedQuery<PedidoProgramarContexto>(
      {
        queryKey: pedidoProgramarQueryKey(pedidoId),
        queryFn: withStaleProgramarRowRefresh(queryClient, () => getPedidoProgramarContexto(pedidoId)),
        enabled: pedidoId > 0,
        retry: retryUnlessClientError,
        refetchOnMount: "always",
        gcTime: 0,
      },
      {
        toastId: "pedido-programar-refetch-error",
        errorMessage: "No se pudo actualizar la programación del pedido. Mostrando datos anteriores.",
        isDefinitiveError: isNotFoundError,
      },
    );

  return { data, isInitialError, isNotFound: isDefinitiveError, isFetchedAfterMount, error };
};
