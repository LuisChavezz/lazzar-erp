import { forwardRef } from "react";
import type { FormFieldError } from "../utils/getFieldError";

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: FormFieldError;
  variant?: "default" | "ghost";
  /**
   * Convierte a mayúsculas mientras se escribe, igual que en `FormInput`.
   *
   * Tiene que hacerse AQUÍ y no en el `onChange` de quien consume: si el
   * consumidor transforma el valor, el DOM se queda con la minúscula y el
   * estado con la mayúscula, React reasigna `node.value` al re-renderizar y el
   * cursor salta al final del campo. Al mutar antes de delegar, el valor del
   * DOM ya coincide con el del estado y React no lo toca.
   */
  forceUppercase?: boolean;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, className = "", variant = "default", forceUppercase = false, onChange, ...props }, ref) => {
    const textareaId =
      props.id ?? (typeof props.name === "string" ? props.name : undefined);

    const baseTextareaStyles =
      "w-full outline-none transition-all placeholder-slate-400 disabled:opacity-50 disabled:cursor-not-allowed resize-none";

    const variants = {
      default: `
        bg-slate-50 dark:bg-black/20
        border border-slate-300 dark:border-slate-700
        rounded-xl px-4 py-3 text-sm font-medium
        text-slate-900 dark:text-white
        focus:ring-2 focus:ring-brand-500/20
        focus:border-brand-500
        focus:bg-white dark:focus:bg-black/40
        ${error ? "border-red-500 focus:border-red-500 focus:ring-red-500/20" : ""}
      `,
      ghost: `
        bg-transparent border-b-2 border-slate-300 dark:border-slate-800
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
            ${forceUppercase ? "uppercase placeholder:normal-case" : ""}
            ${className}
          `}
          {...props}
          onChange={(event) => {
            if (forceUppercase) {
              const textarea = event.currentTarget;
              const value = textarea.value;
              const nextValue = value.toUpperCase();
              if (value !== nextValue) {
                const delta = nextValue.length - value.length;
                const selectionStart = textarea.selectionStart;
                const selectionEnd = textarea.selectionEnd;
                textarea.value = nextValue;
                // `toUpperCase()` no siempre conserva la longitud (p. ej. "ß" →
                // "SS"), así que el cursor se desplaza por el delta resultante
                // en vez de dejarlo en su sitio. Un `<textarea>` siempre admite
                // selección, así que aquí no hace falta el try/catch que sí
                // lleva `FormInput` por los `type` que no la soportan.
                if (selectionStart !== null && selectionEnd !== null) {
                  const clamp = (pos: number) =>
                    Math.min(Math.max(pos + delta, 0), nextValue.length);
                  textarea.setSelectionRange(clamp(selectionStart), clamp(selectionEnd));
                }
              }
            }
            onChange?.(event);
          }}
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
