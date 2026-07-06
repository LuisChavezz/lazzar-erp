"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { rejectChangesOperationsQuote } from "../services/actions";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

export const rejectChangesOperationsQuoteMutationKey = [
  "reject-changes-operations-quote",
] as const;

export const useRejectChangesOperationsQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: rejectChangesOperationsQuoteMutationKey,
    mutationFn: (operationsQuoteId: number) =>
      rejectChangesOperationsQuote(operationsQuoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      toast.success("Cambios rechazados correctamente");
    },
    onError: () => {
      toast.error("No se pudieron rechazar los cambios");
    },
  });
};
