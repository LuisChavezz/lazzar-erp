"use client";

import { useState, useCallback } from "react";

export type ReceiptStep = "upload-documents" | "review-receipt" | "confirm-reception";

export const RECEIPT_STEPS: ReceiptStep[] = [
  "upload-documents",
  "review-receipt",
  "confirm-reception",
];

export const STEP_LABELS: Record<ReceiptStep, string> = {
  "upload-documents": "Carga de OC",
  "review-receipt": "Revisar Recepción",
  "confirm-reception": "Confirmar Recepción",
};

export const STEP_DESCRIPTIONS: Record<ReceiptStep, string> = {
  "upload-documents": "Carga de documentos",
  "review-receipt": "Validación técnica",
  "confirm-reception": "Folio y ubicación",
};

interface UseReceiptStepperReturn {
  currentStep: ReceiptStep;
  /** Ordered list of all steps */
  steps: readonly ReceiptStep[];
  /** Whether the user can advance to the next step */
  canAdvance: boolean;
  /** Advance to the next step */
  goNext: () => void;
}

/**
 * useReceiptStepper
 *
 * Hook that manages the 3-step onboarding flow for goods receipt.
 * Steps 2 and 3 are placeholders — users cannot advance beyond Step 1.
 */
export function useReceiptStepper(): UseReceiptStepperReturn {
  const [currentStep] = useState<ReceiptStep>("upload-documents");

  const goNext = useCallback(() => {
    // Steps 2 and 3 are not implemented yet; block advancement.
    // When ready, implement: setCurrentStep(prev => { ... })
  }, []);

  return {
    currentStep,
    steps: RECEIPT_STEPS,
    canAdvance: false,
    goNext,
  };
}
