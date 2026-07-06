"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { acceptChangesOperationsQuote } from "../services/actions";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

export const acceptChangesOperationsQuoteMutationKey = [
  "accept-changes-operations-quote",
] as const;

export const useAcceptChangesOperationsQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: acceptChangesOperationsQuoteMutationKey,
    mutationFn: (operationsQuoteId: number) =>
      acceptChangesOperationsQuote(operationsQuoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast.success("Cambios aplicados correctamente");
    },
    onError: () => {
      toast.error("No se pudieron aplicar los cambios");
    },
  });
};
