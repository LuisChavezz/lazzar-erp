"use client";

import { hashKey, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Query, QueryKey } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { dropQueriesWhenUnobserved } from "@/src/hooks/dropQueriesWhenUnobserved";
import { useMutationLock } from "@/src/hooks/useMutationLock";
import { toastWarning } from "@/src/utils/toastWarning";
import { drfActionErrorMessage, isNotFoundError } from "@/src/utils/drfWriteErrors";
import { drfFieldMessage } from "@/src/utils/firstDrfFieldMessage";
import { invalidateStockQueries } from "@/src/features/stock/utils/invalidateStockQueries";
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
  /** Folio que mostró quien llama, para el toast si la respuesta no lo trae. */
  folio: string | null;
  motivo: string;
  /**
   * Quien llama pinta el error de `motivo` bajo su campo: lo recibe aquí y no
   * sale en toast. Sin él, ese error sale en toast como los demás.
   */
  onMotivoError?: (message: string) => void;
  /** Cualquier otro fallo (no 404), después de su toast. */
  onError?: (error: unknown) => void;
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
 * volvería a pedir). Se invalidan las existencias (`invalidateStockQueries`), los listados
 * (`["orders"]` por prefijo: Mesa de Control, Programados, Mis pedidos y los
 * selectores de otros módulos), los indicadores de "Mis pedidos" y los pedidos
 * especiales. Nada de eso se espera: el toast sale en cuanto el POST responde
 * y el diálogo se cierra sin aguardar a que los listados se relean (la fila
 * sale cuando llega su relectura).
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
 * `permiso`, `estatus`, `motivo`), en un toast. El de `motivo` no sale en
 * toast si quien llama lo pinta bajo su campo (`onMotivoError`): se decide
 * SOLO en el `onError` de la mutación. Esos 400 no cambian nada.
 */
export const useCancelPedido = (pedidoId: number) => {
  const queryClient = useQueryClient();
  const mutationKey = cancelPedidoMutationKey(pedidoId);
  const { isRunning: isCancelling, isIdle } = useMutationLock(mutationKey);
  const isRecordQuery = isPedidoRecordQuery(pedidoId);

  /**
   * El pedido ya no existe: fuera sus consultas y releer lo que lo lista. Solo
   * espera lo local (cancelar y sacar sus consultas); las relecturas corren
   * sin `await`.
   */
  const forgetPedido = async () => {
    await queryClient.cancelQueries({ predicate: isRecordQuery });
    dropQueriesWhenUnobserved(
      queryClient,
      queryClient.getQueryCache().findAll({ predicate: isRecordQuery }),
    );
    // Inventario: un pedido autorizado antes del #704 del backend aún puede
    // devolver existencias al cancelarse. Fuera las consultas de ESTE pedido
    // (su "Revisar inventario" ya salió arriba y releerlo daría 404).
    void invalidateStockQueries(queryClient, { exclude: isRecordQuery });
    void queryClient.invalidateQueries({ queryKey: ordersQueryKey() });
    void queryClient.invalidateQueries({ queryKey: PEDIDO_KPIS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ["special-orders"] });
  };

  const mutation = useMutation<PedidoCancelResponse, unknown, CancelPedidoVariables>({
    mutationKey,
    mutationFn: ({ motivo }) => cancelPedido(pedidoId, { motivo }),
    onMutate: () => queryClient.cancelQueries({ predicate: isRecordQuery }),
    // El toast sale en cuanto el POST responde; la limpieza corre en `finally`
    // porque el pedido ya se canceló y su fila tiene que salir pase lo que pase.
    onSuccess: async (response, { folio }) => {
      try {
        toast.success(pedidoCancelSummary(response, { id: pedidoId, folio }));
      } finally {
        await forgetPedido();
      }
    },
    onError: async (error, { onMotivoError, onError }) => {
      if (isNotFoundError(error)) {
        toastWarning(PEDIDO_ALREADY_CANCELLED_MESSAGE);
        await forgetPedido();
        return;
      }
      const motivoMessage = onMotivoError ? drfFieldMessage(error, "motivo") : undefined;
      if (onMotivoError && motivoMessage) {
        onMotivoError(motivoMessage);
        return;
      }
      toast.error(cancelPedidoErrorMessage(error));
      onError?.(error);
    },
  });

  /**
   * Dispara la cancelación salvo que ya haya una en vuelo para ESTE pedido
   * (consulta síncrona a la caché). `folio` es el que se mostró, para el
   * toast, y `motivo` va ya validado y recortado. `onSuccess` corre tras
   * cancelar, también si el pedido ya estaba cancelado (404); los errores se
   * reparten en el `onError` de la mutación (`onMotivoError`/`onError`).
   */
  const cancel = (
    folio: string | null,
    motivo: string,
    options: {
      onSuccess?: () => void;
      onError?: (error: unknown) => void;
      onMotivoError?: (message: string) => void;
    } = {},
  ) => {
    if (!isIdle()) return;
    const { onSuccess, onError, onMotivoError } = options;
    mutation.mutate(
      { folio, motivo, onMotivoError, onError },
      {
        onSuccess,
        onError: (error) => {
          if (isNotFoundError(error)) onSuccess?.();
        },
      },
    );
  };

  return { cancel, isCancelling };
};
