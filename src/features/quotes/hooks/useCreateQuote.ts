"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { createQuote } from "../services/actions";
import type { QuoteCreate } from "../interfaces/quote.interface";
import {
  extractQuoteRejectionMessage,
  extractQuoteValidationIssues,
  type QuoteValidationIssue,
} from "../utils/quoteValidationErrors";

export type { QuoteValidationIssue } from "../utils/quoteValidationErrors";

interface UseCreateQuoteOptions {
  onValidationError?: (issues: QuoteValidationIssue[]) => void;
}

export const useCreateQuote = ({ onValidationError }: UseCreateQuoteOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation<QuoteCreate, unknown, QuoteCreate>({
    mutationFn: (payload) => createQuote(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Pedido registrado correctamente");
    },
    onError: (error) => {
      // Motivo real del rechazo cuando el backend lo manda fuera de un campo
      // (p. ej. "Categoría de producto inválida: 12"); si no hay, el genérico.
      let message: string | undefined;
      if (error instanceof AxiosError) {
        const statusCode = error.response?.status;
        const data = error.response?.data;

        if (statusCode === 400 && data) {
          const issues = extractQuoteValidationIssues(data);
          if (issues.length > 0) {
            onValidationError?.(issues);
          }
          message = extractQuoteRejectionMessage(data);
        }
      }
      toast.error(message ?? "No se pudo registrar el pedido");
    },
  });
};
