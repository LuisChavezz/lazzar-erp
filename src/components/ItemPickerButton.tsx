"use client";

import { ChevronDownIcon } from "@/src/components/Icons";
import type { FormFieldError } from "@/src/utils/getFieldError";

interface ItemPickerButtonProps {
  label: string;
  placeholder: string;
  /** Texto de la selección actual; `null` muestra el `placeholder`. */
  selectedLabel: string | null;
  onClick: () => void;
  error?: FormFieldError;
  disabled?: boolean;
}

/**
 * Disparador de un selector apilado (`SingleSelectPickerDialogContent`): mismo
 * lenguaje visual que `FormSelect` (borde, fondo, chevron) para leerse como un
 * selector —no como un campo de texto buscable— aunque abra un diálogo en vez
 * de un `<select>` nativo.
 *
 * Solo pinta: el estado de apertura del diálogo y el valor elegido viven en el
 * formulario que lo usa.
 */
export function ItemPickerButton({
  label,
  placeholder,
  selectedLabel,
  onClick,
  error,
  disabled,
}: ItemPickerButtonProps) {
  return (
    <div className="group/field w-full">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={`
            w-full text-left cursor-pointer
            bg-slate-50 dark:bg-black/20
            border border-slate-300 dark:border-slate-700
            rounded-xl px-4 py-3 pr-10 text-sm font-medium
            outline-none transition-all
            focus:ring-2 focus:ring-brand-500/20
            focus:border-brand-500
            focus:bg-white dark:focus:bg-black/40
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
          `}
        >
          <span
            className={`block truncate ${
              selectedLabel ? "text-slate-900 dark:text-white" : "text-slate-400"
            }`}
          >
            {selectedLabel ?? placeholder}
          </span>
        </button>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
          <ChevronDownIcon className="w-4 h-4" />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-1 font-medium">{error.message}</p>
      )}
    </div>
  );
}
