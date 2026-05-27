"use client";

import { useCallback, useState } from "react";
import {
  useValidateQuoteForReview,
} from "./useValidateQuoteForReview";
import type { QuoteReviewValidationError } from "../utils/validateQuoteForReview";

export type QuoteReviewValidationStatus = "valid" | "invalid" | "error";

export const useQuoteReviewValidationFlow = () => {
  const [reviewValidationErrors, setReviewValidationErrors] = useState<QuoteReviewValidationError[]>([]);
  const [isReviewValidationDialogOpen, setIsReviewValidationDialogOpen] = useState(false);
  const [validationQuoteId, setValidationQuoteId] = useState<number | null>(null);
  const {
    mutateAsync: validateQuoteBeforeReview,
    isPending: isValidatingReview,
  } = useValidateQuoteForReview();

  const resetReviewValidationState = useCallback(() => {
    setReviewValidationErrors([]);
    setIsReviewValidationDialogOpen(false);
  }, []);

  const validateBeforeSendToReview = useCallback(
    async (quoteId: number): Promise<QuoteReviewValidationStatus> => {
      setValidationQuoteId(quoteId);
      resetReviewValidationState();

      try {
        const errors = await validateQuoteBeforeReview(quoteId);

        if (errors.length > 0) {
          setReviewValidationErrors(errors);
          setIsReviewValidationDialogOpen(true);
          return "invalid";
        }

        return "valid";
      } catch {
        return "error";
      }
    },
    [resetReviewValidationState, validateQuoteBeforeReview]
  );

  return {
    reviewValidationErrors,
    isReviewValidationDialogOpen,
    setIsReviewValidationDialogOpen,
    validationQuoteId,
    isValidatingReview,
    validateBeforeSendToReview,
    resetReviewValidationState,
  };
};