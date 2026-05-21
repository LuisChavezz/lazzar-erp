"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { approveOperationsQuote } from "../services/actions";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

export const approveOperationsQuoteMutationKey = [
  "approve-operations-quote",
] as const;

export const useApproveOperationsQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: approveOperationsQuoteMutationKey,
    mutationFn: (operationsQuoteId: number) =>
      approveOperationsQuote(operationsQuoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast.success("Pedido autorizado correctamente");
    },
    onError: () => {
      toast.error("No se pudo autorizar el pedido");
    },
  });
};