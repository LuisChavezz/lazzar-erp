"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { updateQuote } from "../services/actions";
import type { QuoteCreate, QuoteById } from "../interfaces/quote.interface";
import {
  extractQuoteRejectionMessage,
  extractQuoteValidationIssues,
  type QuoteValidationIssue,
} from "../utils/quoteValidationErrors";

export type { QuoteValidationIssue } from "../utils/quoteValidationErrors";

// Variables que recibe la mutación de edición
type UpdateQuoteVariables = {
  quoteId: number;
  payload: Partial<QuoteCreate>;
};

interface UseUpdateQuoteOptions {
  onValidationError?: (issues: QuoteValidationIssue[]) => void;
}

export const useUpdateQuote = ({ onValidationError }: UseUpdateQuoteOptions = {}) => {
  const queryClient = useQueryClient();

  return useMutation<QuoteById, unknown, UpdateQuoteVariables>({
    mutationFn: ({ quoteId, payload }) => updateQuote(quoteId, payload),
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
      toast.success("Cotización actualizada correctamente");
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
      toast.error(message ?? "No se pudo actualizar la cotización");
    },
  });
};
