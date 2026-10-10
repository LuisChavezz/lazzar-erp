"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { KANBAN_COLUMNS } from "@/src/features/quotes/constants/kanbanColumns";
import {
  OperationsQuote,
  OperationsQuoteActionResponse,
} from "../interfaces/operations-quote.interface";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

interface CreateOperationsQuoteMutationParams {
  mutationKey: readonly unknown[];
  mutationFn: (operationsQuoteId: number) => Promise<OperationsQuoteActionResponse>;
  successMessage: string;
  errorMessage: string;
}

export const createOperationsQuoteMutation = ({
  mutationKey,
  mutationFn,
  successMessage,
  errorMessage,
}: CreateOperationsQuoteMutationParams) => {
  return () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationKey,
      mutationFn,
      onSuccess: async ({ cotizacion, pedido }) => {
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
        toast.success(successMessage);
      },
      onError: () => {
        toast.error(errorMessage);
      },
    });
  };
};
