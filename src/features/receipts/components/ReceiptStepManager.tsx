/**
 * ReceiptStepManager.tsx
 *
 * Orchestrator component for the 2-step goods receipt onboarding flow.
 *
 * Step 1 — Select a Purchase Order from the onboarding list.
 * Step 2 — Fill in the receipt form.
 *
 * Owns:
 *  - Current step state (via useReceiptStepper)
 *  - Selected Purchase Order (persisted between steps)
 */

"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { StepProgressBar } from "@/src/components/StepProgressBar";
import { useReceiptStepper, STEP_LABELS } from "../hooks/useReceiptStepper";
import { ReceiptPurchaseOrderSelector } from "./ReceiptPurchaseOrderSelector";
import ReceiptForm from "./ReceiptForm";
import type { ReceiptOnboardingPurchaseOrder } from "../interfaces/receipt-onboarding.interface";

interface ReceiptStepManagerProps {
  /** Called when the full flow completes (form submitted successfully). */
  onClose?: () => void;
}

export function ReceiptStepManager({ onClose }: ReceiptStepManagerProps) {
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] =
    useState<ReceiptOnboardingPurchaseOrder | null>(null);

  const canAdvance = selectedPurchaseOrder !== null;
  const { currentStep, steps, goNext, goBack, reset } =
    useReceiptStepper(canAdvance);

  const handleFormSuccess = () => {
    reset();
    onClose?.();
  };

  return (
    <div className="w-full space-y-6">
      {/* Step progress bar */}
      <StepProgressBar
        steps={steps}
        currentStep={currentStep}
        labels={STEP_LABELS}
      />

      {/* Step content */}
      <div className="space-y-6">
        {currentStep === "select-po" && (
          <ReceiptPurchaseOrderSelector
            selectedOrderId={selectedPurchaseOrder?.id ?? null}
            onSelect={setSelectedPurchaseOrder}
          />
        )}

        {currentStep === "fill-form" && selectedPurchaseOrder && (
          <div className="space-y-4">
            {/* Back link */}
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer bg-transparent border-none p-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              Regresar a: {STEP_LABELS["select-po"]}
            </button>

            <ReceiptForm
              onSuccess={handleFormSuccess}
              purchaseOrder={selectedPurchaseOrder}
            />
          </div>
        )}
      </div>

      {/* Action bar — only visible on Step 1 */}
      {currentStep === "select-po" && (
        <div className="flex items-center justify-end border-t border-slate-200 dark:border-white/10 pt-4">
          <button
            type="button"
            disabled={!canAdvance}
            onClick={goNext}
            className={`inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/30 transition-all ${
              canAdvance
                ? "cursor-pointer hover:bg-sky-700 active:scale-[0.97]"
                : "cursor-not-allowed opacity-60"
            }`}
            aria-disabled={!canAdvance}
          >
            Siguiente: {STEP_LABELS["fill-form"]}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
