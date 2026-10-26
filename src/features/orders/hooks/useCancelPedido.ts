"use client";

import { hashKey, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Query, QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { dropQueriesWhenUnobserved } from "@/src/hooks/dropQueriesWhenUnobserved";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { toastWarning } from "@/src/utils/toastWarning";
import { drfActionErrorMessage, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { cancelPedido } from "../services/actions";
import type { PedidoCancelResponse } from "../interfaces/pedido-cancel.interface";
import { PEDIDO_KPIS_QUERY_KEY } from "../constants/pedidoKpis";
import { ordersQueryKey } from "./useOrders";
import { orderStockDetailQueryKey } from "./useOrderStockDetail";
import { pedidoDetailQueryKey } from "./usePedidoDetail";
import { pedidoMesaControlContextoQueryKey } from "./usePedidoMesaControlContexto";
import { pedidoTrazabilidadQueryKey } from "./usePedidoTrazabilidad";
import { pedidoCancelSummary } from "../utils/pedidoCancelSummary";

interface CancelPedidoVariables {
  /** Folio (o `#id`) para el toast. */
  label: string;
  motivo: string;
}

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
 * ¿La consulta es de ese pedido? Se arma UNA vez por pedido y la usan tanto la
 * cancelación de sus peticiones en vuelo como su salida de la caché, así que
 * las dos actúan siempre sobre el mismo conjunto.
 */
const isPedidoRecordQuery = (pedidoId: number) => {
  const hashes = new Set(pedidoRecordQueryKeys(pedidoId).map((queryKey) => hashKey(queryKey)));
  return (query: Query) => hashes.has(query.queryHash);
};

/** Consultas de existencias que cambian cuando un pedido cancelado devuelve inventario. */
const INVENTORY_QUERY_KEYS: QueryKey[] = [
  ["stockMovements"],
  ["stock-items"],
  ["stock-report"],
  ["stock-movement-report"],
  ["inventory-pipeline"],
  ["order-stock-detail"],
];

const PEDIDO_ALREADY_CANCELLED_MESSAGE =
  "El pedido ya no está disponible; puede que ya se haya cancelado.";

const cancelPedidoErrorMessage = (error: unknown): string =>
  drfActionErrorMessage(
    error,
    "No se pudo cancelar el pedido. Intenta de nuevo.",
    PEDIDO_ALREADY_CANCELLED_MESSAGE,
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
 * de invalidarse (`dropQueriesWhenUnobserved`: un observador montado las
 * volvería a pedir). Se invalidan las existencias (`INVENTORY_QUERY_KEYS`), los listados
 * (`["orders"]` por prefijo: Mesa de Control, Programados, Mis pedidos y los
 * selectores de otros módulos), los indicadores de "Mis pedidos" y los pedidos
 * especiales. La mutación sigue "pending" hasta que los listados montados se
 * releen, así que el diálogo se cierra con la fila ya fuera.
 *
 * Sus peticiones en vuelo se cancelan también ANTES del POST (`onMutate`): una
 * lectura del detalle que respondiera 404 a media cancelación cambiaría la
 * página por "Pedido no encontrado".
 *
 * Un 404 de `cancelar/` significa que el pedido ya no existe para el backend
 * (otra sesión lo canceló): se trata como cancelado para ESTE registro (mismo
 * desalojo e invalidaciones, y el `onSuccess` de la llamada, para salir del
 * detalle), con un aviso en vez del toast de éxito.
 *
 * Errores: el mensaje del backend tal cual (`pedido` con los documentos vivos,
 * `permiso`, `estatus`), en un toast. El de `motivo` NO sale en toast: lo pinta
 * el diálogo bajo su campo. Esos 400 no cambian nada.
 */
export const useCancelPedido = (pedidoId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = cancelPedidoMutationKey(pedidoId);
  const { isRunning: isCancelling, isIdle } = useMutationLock(mutationKey);
  const isRecordQuery = isPedidoRecordQuery(pedidoId);

  /** El pedido ya no existe: fuera sus consultas y releer lo que lo lista. */
  const forgetPedido = async () => {
    await queryClient.cancelQueries({ predicate: isRecordQuery });
    dropQueriesWhenUnobserved(
      queryClient,
      queryClient.getQueryCache().findAll({ predicate: isRecordQuery }),
    );
    // Inventario: la cancelación devuelve existencias (movimiento ENTRADA) y
    // libera reservas. Mismas llaves que `useCreatePicking` más el pipeline y
    // el "Revisar inventario" de los DEMÁS pedidos (por prefijo; el de este ya
    // salió arriba y releerlo daría 404). Sin `await`: la mutación solo espera
    // a los listados que sacan la fila.
    for (const queryKey of INVENTORY_QUERY_KEYS) {
      void queryClient.invalidateQueries({ queryKey, predicate: (query) => !isRecordQuery(query) });
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ordersQueryKey() }),
      queryClient.invalidateQueries({ queryKey: PEDIDO_KPIS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ["special-orders"] }),
    ]);
  };

  const mutation = useMutation<PedidoCancelResponse, unknown, CancelPedidoVariables>({
    mutationKey,
    mutationFn: ({ motivo }) => cancelPedido(pedidoId, { motivo }),
    onMutate: () => queryClient.cancelQueries({ predicate: isRecordQuery }),
    onSuccess: async (response, { label }) => {
      toast.success(pedidoCancelSummary(response, label));
      await forgetPedido();
    },
    onError: async (error) => {
      if (isNotFoundError(error)) {
        toastWarning(PEDIDO_ALREADY_CANCELLED_MESSAGE);
        await forgetPedido();
        return;
      }
      if (drfFieldMessage(error, "motivo")) return;
      toast.error(cancelPedidoErrorMessage(error));
    },
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTE pedido
   * (consulta síncrona a la caché). `label` es el folio para el toast y
   * `motivo` va ya validado y recortado. `onSuccess` corre tras cancelar (y
   * releer los listados), también si el pedido ya estaba cancelado (404);
   * `onError`, con cualquier otro fallo (el toast ya salió, salvo el de
   * `motivo`).
   */
  const cancel = (
    label: string,
    motivo: string,
    options: { onSuccess?: () => void; onError?: (error: unknown) => void } = {},
  ) => {
    if (!isIdle()) return;
    mutation.mutate(
      { label, motivo },
      {
        onSuccess: options.onSuccess,
        onError: (error) => {
          if (isNotFoundError(error)) options.onSuccess?.();
          else options.onError?.(error);
        },
      },
    );
  };

  return { cancel, isCancelling };
};
