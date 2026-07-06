"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { OperationsQuote } from "../interfaces/operations-quote.interface";
import { operationsQuotesQueryKey } from "./useOperationsQuotes";

interface CreateOperationsQuoteMutationParams {
  mutationKey: readonly unknown[];
  mutationFn: (operationsQuoteId: number) => Promise<OperationsQuote>;
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
      onSuccess: () => {
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
