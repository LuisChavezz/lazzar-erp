"use client";

import { useCallback, useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type { PurchaseOrderOnboardingResponse } from "../interfaces/purchase-order-onboarding.interface";
import { usePurchaseOrderOnboardingData } from "../hooks/usePurchaseOrderOnboardingData";
import { PurchaseOrderOnboardingStep1 } from "./PurchaseOrderOnboardingStep1";
import { PurchaseOrderOnboardingStep2 } from "./PurchaseOrderOnboardingStep2";
import { PurchaseOrderOnboardingStep3 } from "./PurchaseOrderOnboardingStep3";

/** Available onboarding steps. */
export type OnboardingStep = "step-1" | "step-2" | "step-3";

/** Ordered list of all steps. */
const STEPS: readonly OnboardingStep[] = ["step-1", "step-2", "step-3"];

/** Human-readable label for each step. */
const STEP_LABELS: Record<OnboardingStep, string> = {
  "step-1": "Datos generales",
  "step-2": "Agregar productos",
  "step-3": "Revisión y confirmación",
};

interface PurchaseOrderOnboardingStepManagerProps {
  /** Called when the onboarding flow should close (e.g. after Step 3 confirm). */
  onClose?: () => void;
}

/**
 * PurchaseOrderOnboardingStepManager
 *
 * Orchestrator for the purchase order onboarding wizard.
 * Manages current step, preserves orden_compra_id and step responses,
 * and passes shared onboarding data to child steps.
 */
export function PurchaseOrderOnboardingStepManager({
  onClose,
}: PurchaseOrderOnboardingStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(STEPS[0]);
  const [ordenCompraId, setOrdenCompraId] = useState<number | null>(null);
  const [step2Response, setStep2Response] =
    useState<PurchaseOrderOnboardingResponse | null>(null);

  const { onboardingData } = usePurchaseOrderOnboardingData();

  /** Called by Step 1 after a successful POST. */
  const handleStep1Success = useCallback((id: number) => {
    setOrdenCompraId(id);
    setCurrentStep("step-2");
  }, []);

  /** Called by Step 2 after a successful POST. */
  const handleStep2Success = useCallback(
    (response: PurchaseOrderOnboardingResponse) => {
      setStep2Response(response);
      setCurrentStep("step-3");
    },
    [],
  );

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={STEPS}
        currentStep={currentStep}
        labels={STEP_LABELS}
      />
      {/* Step content */}
      <div>
        {currentStep === "step-1" && (
          <PurchaseOrderOnboardingStep1
            onSuccess={handleStep1Success}
          />
        )}
        {currentStep === "step-2" && ordenCompraId !== null && (
          <PurchaseOrderOnboardingStep2
            ordenCompraId={ordenCompraId}
            onboardingData={onboardingData}
            onSuccess={handleStep2Success}
          />
        )}
        {currentStep === "step-3" &&
          ordenCompraId !== null &&
          step2Response !== null && (
            <PurchaseOrderOnboardingStep3
              ordenCompraId={ordenCompraId}
              step2Response={step2Response}
              onClose={() => onClose?.()}
            />
          )}
      </div>
    </div>
  );
}
