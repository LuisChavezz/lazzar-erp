/**
 * PriceInput.tsx
 *
 * Reusable editable-price input with inline validation error. Mirrors the
 * pattern used by QuantitySelector.
 *
 * Props:
 *  - value: current price (string, e.g. "12.50")
 *  - onChange: called with the sanitised price after each keystroke
 *  - error: validation message to show below the input, if any
 *  - label: aria-label for the input (default "Precio")
 */

"use client";

interface PriceInputProps {
  value: string;
  onChange: (next: string) => void;
  error?: string;
  label?: string;
}

/** Sanitiza el input de precio: solo dígitos y un único punto decimal. */
function sanitizePriceInput(raw: string): string {
  const [head, ...rest] = raw.replace(/[^0-9.]/g, "").split(".");
  return rest.length ? `${head}.${rest.join("")}` : head;
}

export function PriceInput({
  value,
  onChange,
  error,
  label = "Precio",
}: PriceInputProps) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div className="flex items-center gap-1">
        <span className="text-xs text-slate-400 dark:text-slate-500">$</span>
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(sanitizePriceInput(e.target.value))}
          onFocus={(e) => e.target.select()}
          className={`w-16 text-center text-sm font-semibold bg-transparent border rounded-md py-1 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 ${
            error
              ? "border-red-400 dark:border-red-500 focus:ring-red-500/50 focus:border-red-500"
              : "border-slate-300 dark:border-slate-600 focus:ring-sky-500/50 focus:border-sky-500"
          }`}
          aria-label={label}
        />
      </div>
      {error && (
        <span className="text-[10px] text-red-500 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
