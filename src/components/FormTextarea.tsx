import { forwardRef } from "react";
import type { FormFieldError } from "../utils/getFieldError";

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: FormFieldError;
  variant?: "default" | "ghost";
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, className = "", variant = "default", ...props }, ref) => {
    const textareaId =
      props.id ?? (typeof props.name === "string" ? props.name : undefined);

    const baseTextareaStyles =
      "w-full outline-none transition-all placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none";

    const variants = {
      default: `
        bg-slate-50 dark:bg-black/20
        border border-slate-200 dark:border-slate-700
        rounded-xl px-4 py-3 text-sm font-medium
        text-slate-900 dark:text-white
        focus:ring-2 focus:ring-brand-500/20
        focus:border-brand-500
        focus:bg-white dark:focus:bg-black/40
        ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
      `,
      ghost: `
        bg-transparent border-b-2 border-slate-200 dark:border-slate-800
        focus:border-sky-500 dark:focus:border-sky-500
        px-1 py-2 text-2xl font-bold
        text-slate-900 dark:text-white
        placeholder-slate-300 dark:placeholder-slate-700
        ${error ? "border-red-500 focus:border-red-500" : ""}
      `,
    };

    return (
      <div className={`group/field w-full ${variant === "ghost" ? "md:col-span-2" : ""}`}>
        {label && (
          <label
            htmlFor={textareaId}
            className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1 mb-1 block transition-colors group-focus-within/field:text-brand-500"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            ${baseTextareaStyles}
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

FormTextarea.displayName = "FormTextarea";
