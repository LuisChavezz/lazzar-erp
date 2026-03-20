import { forwardRef } from "react";
import type { FormFieldError } from "../utils/getFieldError";

interface FormToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: FormFieldError;
}

export const FormToggle = forwardRef<HTMLInputElement, FormToggleProps>(
  ({ label, description, error, className = "", ...props }, ref) => {
    const inputId =
      props.id ?? (typeof props.name === "string" ? props.name : undefined);

    return (
      <div className="group/field w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-2 block transition-colors group-focus-within/field:text-brand-500"
          >
            {label}
          </label>
        )}
        <label
          htmlFor={inputId}
          className={`
            flex items-center justify-between gap-4 rounded-xl border px-4 py-3 cursor-pointer
            bg-slate-50 dark:bg-black/20
            border-slate-200 dark:border-slate-700
            ${error ? "border-red-500" : ""}
            ${className}
          `}
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {description || "Activar opción"}
            </p>
          </div>
          <div className="relative inline-flex h-6 w-11 shrink-0 items-center">
            <input ref={ref} id={inputId} type="checkbox" className="peer sr-only" {...props} />
            <span className="absolute inset-0 rounded-full bg-slate-300 dark:bg-slate-700 transition-colors peer-checked:bg-sky-500" />
            <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
        {error && (
          <p className="text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

FormToggle.displayName = "FormToggle";
