import { forwardRef } from "react";
import { SearchIcon } from "./Icons";
import type { FormFieldError } from "../utils/getFieldError";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FormFieldError;
  variant?: "default" | "ghost" | "ghostSearch" | "compact";
  forceUppercase?: boolean;
  leading?: React.ReactNode;
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className = "", variant = "default", forceUppercase = false, leading, onChange, ...props }, ref) => {
    const inputId =
      props.id ?? (typeof props.name === "string" ? props.name : undefined);

    const baseInputStyles = "w-full outline-none transition-all placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      default: `
        bg-slate-50 dark:bg-black/20
        border border-slate-300 dark:border-slate-700
        rounded-xl px-4 py-3 text-sm font-medium
        text-slate-900 dark:text-white
        focus:ring-2 focus:ring-brand-500/20
        focus:border-brand-500
        focus:bg-white dark:focus:bg-black/40
        [--input-current-color:var(--color-slate-900)] 
        dark:[--input-current-color:white]
        ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
      `,
      ghost: `
        bg-transparent border-b-2 border-slate-300 dark:border-slate-800
        focus:border-sky-500 dark:focus:border-sky-500
        px-1 py-2 text-2xl font-bold
        text-slate-900 dark:text-white
        placeholder-slate-300 dark:placeholder-slate-700
        [--input-current-color:var(--color-slate-900)] 
        dark:[--input-current-color:white]
        ${error ? "border-red-500 focus:border-red-500" : ""}
      `,
      ghostSearch: `
        bg-transparent border-b-2 border-slate-300 dark:border-slate-800
        focus:border-sky-500 dark:focus:border-sky-500
        px-1 py-2 pr-8 text-xl font-bold
        text-slate-900 dark:text-white
        placeholder-slate-300 dark:placeholder-slate-700
        [--input-current-color:var(--color-slate-900)] 
        dark:[--input-current-color:white]
        ${error ? "border-red-500 focus:border-red-500" : ""}
      `,
      compact: `
        bg-transparent
        border border-slate-300 dark:border-slate-700
        rounded-md py-1.5 text-xs font-medium
        text-slate-700 dark:text-slate-200
        focus:ring-1 focus:ring-sky-500
        focus:border-sky-500
        [--input-current-color:var(--color-slate-700)]
        dark:[--input-current-color:var(--color-slate-200)]
        ${error ? "border-rose-400 dark:border-rose-500" : ""}
      `
    };

    return (
      <div className={`group/field w-full ${variant === "ghost" ? "md:col-span-2" : ""}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500"
          >
            {label}
          </label>
        )}
        <div className={variant === "ghostSearch" || !!leading ? "relative" : ""}>
          {leading && (
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2 text-xs text-slate-400">
              {leading}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              ${baseInputStyles}
              ${variants[variant]}
              ${variant === "compact" ? (leading ? "pl-5 pr-2" : "px-2") : ""}
              ${forceUppercase ? "uppercase" : ""}
              ${className}
            `}
            {...props}
            onChange={(event) => {
              if (forceUppercase) {
                const nextValue = event.currentTarget.value.toUpperCase();
                if (event.currentTarget.value !== nextValue) {
                  event.currentTarget.value = nextValue;
                }
              }
              onChange?.(event);
            }}
            autoComplete="off"
          />
          {variant === "ghostSearch" && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
              <SearchIcon className="w-4 h-4 text-slate-400" />
            </div>
          )}
        </div>
        {error && (
          <p className={variant === "compact" ? "text-[10px] text-rose-600 dark:text-rose-400 mt-0.5" : "text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200"}>
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
