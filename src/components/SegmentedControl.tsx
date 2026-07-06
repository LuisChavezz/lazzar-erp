"use client";

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Grupo de botones tipo "toggle" con un único valor seleccionado. Extraído
 * del toggle de tipo de orden (`ReceiptOrderSelector`) y del control de
 * serie de recepción (`ReceiptForm`), que compartían el mismo marcado y
 * estilos.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex rounded-lg border border-slate-300 dark:border-slate-600 overflow-hidden ${className}`}
    >
      {options.map((opt, i) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={isSelected}
            className={`px-5 py-2 text-xs font-bold tracking-wide transition-all cursor-pointer ${
              i < options.length - 1
                ? "border-r border-slate-300 dark:border-slate-600"
                : ""
            } ${
              isSelected
                ? "bg-sky-600 text-white shadow-inner"
                : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
