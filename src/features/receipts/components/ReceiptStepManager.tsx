/**
 * ReceiptStepManager.tsx
 *
 * Orchestrator component for the 3-step goods receipt onboarding flow.
 *
 * Manages the current step state, renders the step indicator,
 * and conditionally displays the content for each step.
 *
 * Steps 2 ("review-receipt") and 3 ("confirm-reception") are
 * currently placeholders — users cannot advance beyond Step 1.
 */

"use client";

import { ArrowRight } from "lucide-react";
import { useReceiptStepper, STEP_LABELS } from "../hooks/useReceiptStepper";
import { ReceiptStepIndicator } from "./ReceiptStepIndicator";
import { ReceiptUploadDocument } from "./ReceiptUploadDocument";
import { OrderDetails } from "./OrderDetails";

export function ReceiptStepManager() {
  const { currentStep, canAdvance, goNext } = useReceiptStepper();

  const isStep1 = currentStep === "upload-documents";

  return (
    <div className="w-full space-y-6">
      {/* Step indicator */}
      <ReceiptStepIndicator currentStep={currentStep} />

      {/* Step content */}
      <div className="space-y-6">
        {isStep1 && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            {/* Left — File upload area */}
            <div className="lg:col-span-3">
              <ReceiptUploadDocument />
            </div>

            {/* Right — Order details */}
            <div className="lg:col-span-2">
              <OrderDetails />
            </div>
          </div>
        )}

        {/* Step 2 placeholder */}
        {currentStep === "review-receipt" && (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-100/50 dark:bg-white/5 p-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Validación técnica — Próximamente
            </p>
          </div>
        )}

        {/* Step 3 placeholder */}
        {currentStep === "confirm-reception" && (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/20 bg-slate-100/50 dark:bg-white/5 p-12 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Folio y ubicación — Próximamente
            </p>
          </div>
        )}
      </div>

      {/* Action bar */}
      {isStep1 && (
        <div className="flex items-center justify-end border-t border-slate-200 dark:border-white/10 pt-4">
          <button
            type="button"
            disabled={!canAdvance}
            onClick={goNext}
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white opacity-60 shadow-lg shadow-sky-500/30 transition-all"
            aria-disabled
          >
            Siguiente: {STEP_LABELS["review-receipt"]}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
