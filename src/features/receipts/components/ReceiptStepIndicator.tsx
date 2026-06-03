/**
 * ReceiptStepIndicator.tsx
 *
 * Presentational component that renders the 3-step progress indicator
 * for the goods receipt onboarding flow.
 *
 * Each step shows its number, a check/completed icon (when done),
 * a label, and a brief description. The active step is visually
 * highlighted with the brand color; future steps appear muted.
 */

import type { ReceiptStep } from "../hooks/useReceiptStepper";
import { RECEIPT_STEPS, STEP_LABELS, STEP_DESCRIPTIONS } from "../hooks/useReceiptStepper";

interface ReceiptStepIndicatorProps {
  currentStep: ReceiptStep;
}

export function ReceiptStepIndicator({ currentStep }: ReceiptStepIndicatorProps) {
  const currentIndex = RECEIPT_STEPS.indexOf(currentStep);

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-2">
        {RECEIPT_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;
          const stepNumber = index + 1;

          return (
            <div
              key={step}
              className="flex flex-1 flex-col items-center gap-2"
            >
              {/* Connector line — hidden on last step */}
              <div className="flex w-full items-center">
                <div className="flex-1">
                  {index > 0 && (
                    <div
                      className={`h-0.5 transition-colors duration-300 ${
                        isPast || isActive
                          ? "bg-sky-500 dark:bg-sky-400"
                          : "bg-slate-200 dark:bg-white/10"
                      }`}
                    />
                  )}
                </div>

                {/* Step circle */}
                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    isActive
                      ? "bg-sky-600 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-600 ring-offset-2 dark:ring-offset-zinc-900"
                      : isPast
                        ? "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400"
                        : "bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-400"
                  }`}
                  aria-current={isActive ? "step" : undefined}
                >
                  {isPast ? (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    stepNumber
                  )}
                </div>

                <div className="flex-1">
                  {index < RECEIPT_STEPS.length - 1 && (
                    <div
                      className={`h-0.5 transition-colors duration-300 ${
                        isPast
                          ? "bg-sky-500 dark:bg-sky-400"
                          : "bg-slate-200 dark:bg-white/10"
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Label below */}
              <div className="text-center">
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest transition-colors duration-300 ${
                    isActive
                      ? "text-sky-600 dark:text-sky-400"
                      : isPast
                        ? "text-slate-500 dark:text-slate-400"
                        : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  Paso {stepNumber}
                </p>
                <p
                  className={`mt-0.5 text-xs font-semibold transition-colors duration-300 ${
                    isActive
                      ? "text-slate-800 dark:text-white"
                      : isPast
                        ? "text-slate-600 dark:text-slate-300"
                        : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {STEP_LABELS[step]}
                </p>
                <p
                  className={`mt-px text-[10px] transition-colors duration-300 ${
                    isActive
                      ? "text-slate-500 dark:text-slate-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  {STEP_DESCRIPTIONS[step]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
