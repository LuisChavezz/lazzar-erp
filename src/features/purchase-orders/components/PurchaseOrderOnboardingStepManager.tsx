"use client";

import { useCallback, useState } from "react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import type { PurchaseOrderEncabezados } from "../interfaces/purchase-order-onboarding.interface";
import {
  PURCHASE_ORDER_WIZARD_STEPS as STEPS,
  PURCHASE_ORDER_WIZARD_STEP_LABELS as STEP_LABELS,
  type PurchaseOrderWizardStep as OnboardingStep,
} from "../constants/purchaseOrderWizardSteps";
import { usePurchaseOrderOnboardingData } from "../hooks/usePurchaseOrderOnboardingData";
import { PurchaseOrderOnboardingStep1 } from "./PurchaseOrderOnboardingStep1";
import { PurchaseOrderOnboardingStep2 } from "./PurchaseOrderOnboardingStep2";

interface PurchaseOrderOnboardingStepManagerProps {
  /** Called when the onboarding flow should close (e.g. after Step 2 succeeds). */
  onClose?: () => void;
}

/**
 * PurchaseOrderOnboardingStepManager
 *
 * Orchestrator for the purchase order onboarding wizard.
 * Manages current step, preserves Step 1's captured encabezados,
 * and passes shared onboarding data to child steps.
 */
export function PurchaseOrderOnboardingStepManager({
  onClose,
}: PurchaseOrderOnboardingStepManagerProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(STEPS[0]);
  const [step1Data, setStep1Data] =
    useState<PurchaseOrderEncabezados | null>(null);

  const { onboardingData } = usePurchaseOrderOnboardingData();

  /** Called by Step 1 after form validation. Stores the captured encabezados and advances. */
  const handleStep1Success = useCallback(
    (data: PurchaseOrderEncabezados) => {
      setStep1Data(data);
      setCurrentStep("step-2");
    },
    [],
  );

  /** Called by Step 2 after a successful POST — the wizard's final step. */
  const handleStep2Success = () => onClose?.();

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
        {currentStep === "step-2" && step1Data !== null && (
          <PurchaseOrderOnboardingStep2
            step1Data={step1Data}
            onboardingData={onboardingData}
            onSuccess={handleStep2Success}
          />
        )}
      </div>
    </div>
  );
}
