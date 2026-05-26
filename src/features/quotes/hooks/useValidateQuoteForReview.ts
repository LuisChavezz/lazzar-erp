"use client";

import { AxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getQuoteOnboardingDataQueryOptions } from "./useQuoteOnboardingData";
import { getQuoteQueryOptions } from "./useQuote";
import {
  validateQuoteForReview as runQuoteReviewValidation,
  type QuoteReviewValidationError,
} from "../utils/validateQuoteForReview";

export const validateQuoteForReviewMutationKey = [
  "validate-quote-for-review",
] as const;

export const useValidateQuoteForReview = () => {
  const queryClient = useQueryClient();

  return useMutation<QuoteReviewValidationError[], unknown, number>({
    mutationKey: validateQuoteForReviewMutationKey,
    mutationFn: async (quoteId: number) => {
      const [quoteData, onboardingData] = await Promise.all([
        queryClient.fetchQuery(getQuoteQueryOptions(quoteId)),
        queryClient.fetchQuery(getQuoteOnboardingDataQueryOptions()),
      ]);

      return runQuoteReviewValidation(quoteData, onboardingData);
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? ((error.response?.data?.detail as string | undefined) ??
              "No se pudieron validar los datos de la cotización")
          : "No se pudieron validar los datos de la cotización";

      toast.error(message);
    },
  });
};