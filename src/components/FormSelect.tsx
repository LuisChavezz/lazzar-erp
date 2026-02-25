import { forwardRef } from "react";
import { FieldError } from "react-hook-form";
import { ChevronDownIcon } from "./Icons";

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: FieldError;
  options?: { value: string | number; label: string }[];
  children?: React.ReactNode;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, className = "", options, children, ...props }, ref) => {
    const selectId =
      props.id ?? (typeof props.name === "string" ? props.name : undefined);

    return (
      <div className="group/field w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full appearance-none
              bg-slate-50 dark:bg-black/20
              border border-slate-200 dark:border-slate-700
              rounded-xl px-4 py-3 pr-10 text-sm font-medium
              text-slate-900 dark:text-white
              outline-none transition-all
              focus:ring-2 focus:ring-brand-500/20
              focus:border-brand-500
              focus:bg-white dark:focus:bg-black/40
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
              ${className}
            `}
            {...props}
          >
            {options ? (
              options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                  {opt.label}
                </option>
              ))
            ) : (
              children
            )}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
            <ChevronDownIcon className="w-4 h-4" />
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";
