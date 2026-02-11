import React from "react";

interface FormCancelButtonProps {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}

export function FormCancelButton({
  onClick,
  label = "Limpiar",
  disabled,
}: FormCancelButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-medium cursor-pointer text-zinc-800 shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface FormSubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isPending?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
}

export function FormSubmitButton({
  isPending,
  loadingLabel = "Guardando...",
  children,
  className,
  ...props
}: FormSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isPending || props.disabled}
      className={`rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 cursor-pointer ${
        isPending || props.disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className || ""}`}
      {...props}
    >
      {isPending ? loadingLabel : children}
    </button>
  );
}
