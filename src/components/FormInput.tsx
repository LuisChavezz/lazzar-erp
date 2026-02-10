import { forwardRef } from "react";
import { FieldError } from "react-hook-form";

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
  variant?: "default" | "ghost";
}

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, className = "", variant = "default", ...props }, ref) => {
    
    const baseInputStyles = "w-full outline-none transition-all placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed";
    
    const variants = {
      default: `
        bg-slate-50 dark:bg-black/20
        border border-slate-200 dark:border-slate-700
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
        bg-transparent border-b-2 border-slate-200 dark:border-slate-800
        focus:border-sky-500 dark:focus:border-sky-500
        px-1 py-2 text-2xl font-bold
        text-slate-900 dark:text-white
        placeholder-slate-300 dark:placeholder-slate-700
        [--input-current-color:var(--color-slate-900)] 
        dark:[--input-current-color:white]
        ${error ? "border-red-500 focus:border-red-500" : ""}
      `
    };

    return (
      <div className={`group/field w-full ${variant === "ghost" ? "md:col-span-2" : ""}`}>
        {label && (
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            ${baseInputStyles}
            ${variants[variant]}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-600 mt-1 font-medium animate-in slide-in-from-top-1 fade-in duration-200">
            {error.message}
          </p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";
