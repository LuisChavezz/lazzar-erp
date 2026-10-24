"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AxiosError } from "axios";
import { drfActionErrorMessage } from "@/src/utils/drfWriteErrors";
import { operationsQuotesQueryKey } from "../../operations/hooks/useOperationsQuotes";
import type { QuoteSubmitForReviewResponse } from "../interfaces/quote.interface";
import { submitQuoteForReview } from "../services/actions";
import { extractProcessCompatibilityMessage } from "../utils/quoteValidationErrors";
import { QUOTE_COMENTARIOS_KEY } from "./useQuoteComentarios";

export const submitQuoteForReviewMutationKey = ["submit-quote-for-review"] as const;

export interface SubmitQuoteForReviewVariables {
  id: number;
  /**
   * Solo desde estatus 4 y solo si el usuario escribió algo (ya recortado).
   * Sin él, la petición va sin cuerpo.
   */
  comentario?: string;
}

// ─── Mutación para enviar una cotización a revisión (Borrador/Rechazada → Por Autorizar) ──
export const useSubmitQuoteForReview = () => {
  const queryClient = useQueryClient();

  return useMutation<QuoteSubmitForReviewResponse, unknown, SubmitQuoteForReviewVariables>({
    mutationKey: submitQuoteForReviewMutationKey,
    mutationFn: ({ id, comentario }) => submitQuoteForReview(id, comentario),
    onSuccess: () => {
      toast.success("Cotización enviada a revisión correctamente");
    },
    onError: (error) => {
      // 400 `estatus` (ya en revisión o autorizada), `permiso` o `detail`: el
      // mensaje del backend, no uno genérico. `compatibilidad_proceso` trae
      // una lista y se muestra completa.
      toast.error(
        (error instanceof AxiosError
          ? extractProcessCompatibilityMessage(error.response?.data)
          : undefined) ??
          drfActionErrorMessage(
            error,
            "Error al enviar la cotización a revisión",
            "La cotización ya no está disponible."
          )
      );
    },
    // También tras un error: un 400 de estatus significa que lo pintado ya no
    // es el estado real.
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote", id] });
      queryClient.invalidateQueries({ queryKey: operationsQuotesQueryKey });
      queryClient.invalidateQueries({ queryKey: [QUOTE_COMENTARIOS_KEY, id] });
    },
  });
};
