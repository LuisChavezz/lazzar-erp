/**
 * QuantitySelector.tsx
 *
 * Reusable quantity stepper with increment/decrement buttons and a direct
 * numeric input. Mirrors the pattern used in PurchaseOrderOnboardingStep2.
 *
 * Props:
 *  - value: current quantity
 *  - onChange: called with the new quantity after sanitisation
 *  - min: minimum allowed value (default 1)
 *  - label: aria-label for the input (default "Cantidad")
 */

"use client";

import { PlusIcon } from "./Icons";

interface QuantitySelectorProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  label?: string;
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  label = "Cantidad",
}: QuantitySelectorProps) {
  const sanitise = (raw: string) => {
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits === "") return min;
    return Math.max(min, parseInt(digits, 10) || min);
  };

  const decrement = () => onChange(Math.max(min, value - 1));
  const increment = () => onChange(value + 1);

  return (
    <div className="shrink-0 flex items-center gap-1">
      {/* Decrement */}
      <button
        type="button"
        onClick={decrement}
        className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
        aria-label="Reducir cantidad"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M5 12h14"/></svg>
      </button>

      {/* Input */}
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(sanitise(e.target.value))}
        onFocus={(e) => e.target.select()}
        className="w-12 text-center text-sm font-semibold bg-transparent border border-slate-300 dark:border-slate-600 rounded-md py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
        aria-label={label}
      />

      {/* Increment */}
      <button
        type="button"
        onClick={increment}
        className="w-7 h-7 rounded-md border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer bg-transparent"
        aria-label="Aumentar cantidad"
      >
        <PlusIcon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
