"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { rejectOperationsQuote } from "../services/actions";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

export const rejectOperationsQuoteMutationKey = [
  "reject-operations-quote",
] as const;

export const useRejectOperationsQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: rejectOperationsQuoteMutationKey,
    mutationFn: (operationsQuoteId: number) =>
      rejectOperationsQuote(operationsQuoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast.success("Pedido rechazado correctamente");
    },
    onError: () => {
      toast.error("No se pudo rechazar el pedido");
    },
  });
};