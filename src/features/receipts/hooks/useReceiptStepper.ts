"use client";

import { useState, useCallback } from "react";

export type ReceiptStep = "select-po" | "fill-form";

export const RECEIPT_STEPS: ReceiptStep[] = ["select-po", "fill-form"];

export const STEP_LABELS: Record<ReceiptStep, string> = {
  "select-po": "Seleccionar Orden",
  "fill-form": "Registrar Recepción",
};

interface UseReceiptStepperReturn {
  currentStep: ReceiptStep;
  /** Ordered list of all steps */
  steps: readonly ReceiptStep[];
  /** Whether the user can advance to the next step */
  canAdvance: boolean;
  /** Advance to the next step */
  goNext: () => void;
  /** Go back to the previous step */
  goBack: () => void;
  /** Reset to the first step */
  reset: () => void;
}

/**
 * useReceiptStepper
 *
 * Hook that manages the 2-step onboarding flow for goods receipt.
 * The caller controls whether the user can advance via `canAdvance`.
 */
export function useReceiptStepper(canAdvance: boolean): UseReceiptStepperReturn {
  const [currentStep, setCurrentStep] = useState<ReceiptStep>(RECEIPT_STEPS[0]);

  const goNext = useCallback(() => {
    if (!canAdvance) return;
    const currentIndex = RECEIPT_STEPS.indexOf(currentStep);
    if (currentIndex < RECEIPT_STEPS.length - 1) {
      setCurrentStep(RECEIPT_STEPS[currentIndex + 1]);
    }
  }, [canAdvance, currentStep]);

  const goBack = useCallback(() => {
    const currentIndex = RECEIPT_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(RECEIPT_STEPS[currentIndex - 1]);
    }
  }, [currentStep]);

  const reset = useCallback(() => {
    setCurrentStep(RECEIPT_STEPS[0]);
  }, []);

  return {
    currentStep,
    steps: RECEIPT_STEPS,
    canAdvance,
    goNext,
    goBack,
    reset,
  };
}
