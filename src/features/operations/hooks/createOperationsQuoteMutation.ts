"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import {
  drfActionErrorMessage,
  isDrfActionRejection,
  isNotFoundError,
} from "@/src/utils/drfWriteErrors";
import { extractProcessCompatibilityMessage } from "@/src/features/quotes/utils/quoteValidationErrors";
import { KANBAN_COLUMNS } from "@/src/features/quotes/constants/kanbanColumns";
import {
  OperationsQuote,
  OperationsQuoteActionResponse,
} from "../interfaces/operations-quote.interface";
import {
  invalidatePedidoLinesRewritten,
  invalidatePedidoLists,
} from "@/src/features/orders/hooks/invalidatePedidoLinesRewritten";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

/**
 * Qué le hace la acción al pedido de la cotización, según el backend:
 * `autorizar` lo CREA, `aceptar-cambios` REESCRIBE sus renglones, servicios
 * extras y totales, y `rechazar` / `rechazar-cambios` no lo tocan.
 */
export type OperationsQuotePedidoEffect = "creates" | "rewrites" | "none";

interface CreateOperationsQuoteMutationParams {
  mutationKey: readonly unknown[];
  /**
   * Solo se usa en el error: en el éxito la respuesta ya dice qué pasó
   * (`pedido` o `pedido_id`), pero un error sin respuesta no lo dice.
   */
  pedidoEffect: OperationsQuotePedidoEffect;
  mutationFn: (operationsQuoteId: number) => Promise<OperationsQuoteActionResponse>;
  successMessage: string;
  /** Respaldo cuando el error no trae un mensaje aprovechable (red, 5xx). */
  errorMessage: string;
  /**
   * 404: la cotización ya no está en el alcance de mesa de control (otra
   * sesión la autorizó, la rechazó o la sacó de revisión).
   */
  notFoundMessage: string;
}

/**
 * Aplica a la caché el resultado de una acción de mesa de control y marca
 * como obsoletas las consultas que dependen de él. Lo comparten la fábrica de
 * abajo y `useRejectOperationsQuote` (que lleva cuerpo y su propio manejo de
 * errores, así que no cabe en la fábrica).
 */
export const applyOperationsQuoteActionResult = async (
  queryClient: QueryClient,
  { cotizacion, pedido, pedido_id }: OperationsQuoteActionResponse
) => {
  // La fila se actualiza con lo que respondió la acción ANTES de
  // invalidar: si ese refetch falla, `useOperationsQuotes` conserva la
  // tabla (no expone el `isError` crudo), y sin esto la cotización ya
  // procesada seguiría pintada como pendiente y con sus acciones
  // disponibles. Se cancela primero cualquier fetch en vuelo, que traería
  // el estado anterior y pisaría este valor. `estatus_label` no viene en
  // la respuesta: se toma de la misma tabla de estatus que usa el badge.
  await queryClient.cancelQueries({ queryKey: operationsQuotesQueryKey });
  queryClient.setQueryData<OperationsQuote[]>(operationsQuotesQueryKey, (rows) =>
    rows?.map((row) =>
      row.id === cotizacion.id
        ? {
            ...row,
            estatus: cotizacion.estatus,
            estatus_label:
              KANBAN_COLUMNS.find((col) => col.estatus === cotizacion.estatus)?.label ??
              row.estatus_label,
            autorizada_at: cotizacion.autorizada_at,
            cambios_solicitados_at: cotizacion.cambios_solicitados_at,
            updated_at: cotizacion.updated_at,
            ...(pedido ? { pedido_id: pedido.id, pedido_folio: pedido.folio } : {}),
          }
        : row,
    ),
  );
  queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
  queryClient.invalidateQueries({ queryKey: ["quotes"] });
  queryClient.invalidateQueries({ queryKey: ["quote"] });
  // Autorizar CREA el pedido (la respuesta lo trae en `pedido`): cambian los
  // listados de pedidos y sus indicadores. Aceptar cambios REESCRIBE el
  // existente (renglones, servicios extras y totales; la respuesta trae solo
  // `pedido_id`): además, su detalle, trazabilidad, programación y los
  // programados. Rechazar y rechazar cambios no tocan el pedido.
  if (pedido_id !== undefined) {
    void invalidatePedidoLinesRewritten(queryClient);
  } else if (pedido) {
    void invalidatePedidoLists(queryClient);
  }
};

/**
 * Error de una acción que toca el pedido: si el backend RECHAZÓ la acción
 * (400, 403 o 409, o 404 porque la cotización ya no está), nada cambió. Si no
 * se sabe (red caída, 5xx, el reintento tras refrescar el token falló), el
 * backend pudo haberla aplicado: se invalida lo mismo que en el éxito, sin id
 * de pedido porque la respuesta no llegó (las dos reglas invalidan por raíz).
 */
export const invalidatePedidosAfterFailedAction = (
  queryClient: QueryClient,
  error: unknown,
  pedidoEffect: OperationsQuotePedidoEffect,
) => {
  if (pedidoEffect === "none" || isDrfActionRejection(error) || isNotFoundError(error)) {
    return;
  }
  void (pedidoEffect === "rewrites"
    ? invalidatePedidoLinesRewritten(queryClient)
    : invalidatePedidoLists(queryClient));
};

export const createOperationsQuoteMutation = ({
  mutationKey,
  pedidoEffect,
  mutationFn,
  successMessage,
  errorMessage,
  notFoundMessage,
}: CreateOperationsQuoteMutationParams) => {
  return () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationKey,
      mutationFn,
      onSuccess: async (response) => {
        await applyOperationsQuoteActionResult(queryClient, response);
        toast.success(successMessage);
      },
      // El mensaje del backend (400 `cotizacion`/`permiso`, `detail`), igual
      // que el rechazo; el texto fijo solo cuando no hay uno aprovechable.
      onError: (error, operationsQuoteId) => {
        // `compatibilidad_proceso` (matriz prenda/proceso) trae una lista: se
        // muestra completa, no solo el primer mensaje.
        toast.error(
          (error instanceof AxiosError
            ? extractProcessCompatibilityMessage(error.response?.data)
            : undefined) ?? drfActionErrorMessage(error, errorMessage, notFoundMessage)
        );
        // Mismas invalidaciones que el rechazo en su error: un 400 de estatus
        // o un 404 significan que lo pintado ya no es el estado real (otra
        // sesión movió la cotización), y sin releer la fila seguiría
        // ofreciendo la acción que acaba de fallar.
        queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
        queryClient.invalidateQueries({ queryKey: ["quotes"] });
        queryClient.invalidateQueries({ queryKey: ["quote", operationsQuoteId] });
        invalidatePedidosAfterFailedAction(queryClient, error, pedidoEffect);
      },
    });
  };
};
