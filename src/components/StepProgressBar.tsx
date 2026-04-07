/**
 * StepProgressBar.tsx
 * Componente reutilizable para mostrar progreso entre pasos.
 * Proporciona roles/atributos ARIA para accesibilidad y muestra una barra
 * visual además del título del paso.
 */
import { memo } from "react";

export interface StepProgressBarProps {
  steps: readonly string[];
  currentStep: string;
  labels: Record<string, string>;
  className?: string;
  ariaLabel?: string;
}

/**
 * `StepProgressBar`
 * Presentación pura: recibe `steps`, `currentStep` y `labels` y renderiza
 * la pista de progreso con atributos ARIA adecuados.
 */
export const StepProgressBar = memo(function StepProgressBar({
  steps,
  currentStep,
  labels,
  className = "",
  ariaLabel = "Progreso por pasos",
}: StepProgressBarProps) {
  const idx = steps.indexOf(currentStep);
  const currentIndex = idx >= 0 ? idx : 0;
  const totalSteps = Math.max(steps.length, 1);

  return (
    <div
      className={`flex flex-col items-center gap-1.5 pb-4 mb-2 mt-4 border-b border-slate-100 dark:border-white/10 ${className}`.trim()}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-valuenow={Math.min(currentIndex + 1, totalSteps)}
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        Paso {Math.min(currentIndex + 1, totalSteps)} de {steps.length}
      </p>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {labels[currentStep] ?? currentStep}
      </p>
      <div className="flex items-center gap-1.5 mt-0.5" aria-hidden="true">
        {steps.map((step, i) => (
          <div
            key={step}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i <= currentIndex
                ? "w-8 bg-sky-500 dark:bg-sky-400"
                : "w-8 bg-slate-200 dark:bg-white/10"
            }`}
          />
        ))}
      </div>
    </div>
  );
});
