"use client";

import { useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import { PurchaseOrderOnboardingStep1 } from "./PurchaseOrderOnboardingStep1";

/** Available onboarding steps. Extend with step 2 and 3 later. */
export type OnboardingStep = "step-1" | "step-2" | "step-3";

/** Ordered list of all steps. Add "step-2" and "step-3" when ready. */
const STEPS: readonly OnboardingStep[] = ["step-1", "step-2", "step-3"];

/** Human-readable label for each step. */
const STEP_LABELS: Record<OnboardingStep, string> = {
  "step-1": "Verificar datos de onboarding",
  "step-2": "Configurar orden",
  "step-3": "Revisar y confirmar",
};

/**
 * PurchaseOrderOnboardingStepManager
 *
 * Orchestrator for the purchase order onboarding wizard.
 * Currently only Step 1 is implemented.
 * Add "step-2" and "step-3" to STEPS and STEP_LABELS when ready.
 */
export function PurchaseOrderOnboardingStepManager() {
  const [currentStep] = useState<OnboardingStep>(STEPS[0]);

  return (
    <div className="w-full space-y-6">
      <StepProgressBar
        steps={STEPS}
        currentStep={currentStep}
        labels={STEP_LABELS}
      />
      {/* Step content */}
      <div>
        {currentStep === "step-1" && <PurchaseOrderOnboardingStep1 />}
        {/* Future: currentStep === "step-2" && <PurchaseOrderOnboardingStep2 /> */}
        {/* Future: currentStep === "step-3" && <PurchaseOrderOnboardingStep3 /> */}
      </div>
    </div>
  );
}
