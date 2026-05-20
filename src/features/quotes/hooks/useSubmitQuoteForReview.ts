"use client";

import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { Quote } from "../interfaces/quote.interface";
import { submitQuoteForReview } from "../services/actions";

export const submitQuoteForReviewMutationKey = ["submit-quote-for-review"] as const;

// ─── Mutación para enviar una cotización a revisión (Borrador → Por Autorizar) ──
export const useSubmitQuoteForReview = () => {
  const queryClient = useQueryClient();

  return useMutation<Quote, unknown, number>({
    mutationKey: submitQuoteForReviewMutationKey,
    mutationFn: (id: number) => submitQuoteForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Cotización enviada a revisión correctamente");
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data?.detail as string | undefined) ??
              "Error al enviar la cotización a revisión")
          : "Error al enviar la cotización a revisión";

      toast.error(message);
    },
  });
};