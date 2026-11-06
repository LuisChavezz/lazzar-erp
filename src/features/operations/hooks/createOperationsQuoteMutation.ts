"use client";

import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { drfActionErrorMessage } from "@/src/utils/drfWriteErrors";
import { extractProcessCompatibilityMessage } from "@/src/features/quotes/utils/quoteValidationErrors";
import { KANBAN_COLUMNS } from "@/src/features/quotes/constants/kanbanColumns";
import {
  OperationsQuote,
  OperationsQuoteActionResponse,
} from "../interfaces/operations-quote.interface";
import { ORDERS_QUERY_KEY } from "@/src/features/orders/hooks/useOrders";
import { PEDIDO_KPIS_QUERY_KEY } from "@/src/features/orders/constants/pedidoKpis";
import { pedidoDetailQueryKey } from "@/src/features/orders/hooks/usePedidoDetail";
import { pedidoProgramarQueryKey } from "@/src/features/orders/hooks/usePedidoProgramarContexto";
import { pedidoTrazabilidadQueryKey } from "@/src/features/orders/hooks/usePedidoTrazabilidad";
import { invalidateScheduledPedidos } from "@/src/features/picking/hooks/useScheduledPedidos";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

interface CreateOperationsQuoteMutationParams {
  mutationKey: readonly unknown[];
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
  // Autorizar CREA el pedido (la respuesta lo trae en `pedido`) y aceptar
  // cambios REESCRIBE el existente (renglones, servicios extras y totales; la
  // respuesta trae solo `pedido_id`): en ambos casos las listas de pedidos
  // (Mesa de Control › Pedidos, Mis pedidos, los selectores) ya no están al
  // día. Rechazar y rechazar cambios no tocan el pedido.
  if (pedido || pedido_id !== undefined) {
    queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY });
    // Los indicadores de "Mis pedidos" suman `gran_total` y van fuera del prefijo.
    queryClient.invalidateQueries({ queryKey: PEDIDO_KPIS_QUERY_KEY });
  }
  // El pedido reescrito puede estar en caché con lo anterior. Mismas llaves que
  // la edición de Mesa de Control (`useUpdatePedidoMesaControl`), que también
  // reescribe las líneas. Un pedido recién autorizado no tiene nada en caché.
  if (pedido_id !== undefined) {
    queryClient.invalidateQueries({ queryKey: pedidoDetailQueryKey(pedido_id) });
    queryClient.invalidateQueries({ queryKey: pedidoProgramarQueryKey(pedido_id) });
    queryClient.invalidateQueries({ queryKey: pedidoTrazabilidadQueryKey(pedido_id) });
    // Lo programado puede cambiar con las líneas: Pedidos de Almacén y el Paso 1
    // de Nuevo Surtido.
    void invalidateScheduledPedidos(queryClient);
  }
};

export const createOperationsQuoteMutation = ({
  mutationKey,
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
      },
    });
  };
};
