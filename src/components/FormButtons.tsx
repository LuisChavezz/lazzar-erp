import React from "react";
import { HeartFilledIcon, HeartIcon } from "./Icons";

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

interface FilterSaveToggleButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  activeTitle?: string;
  inactiveTitle?: string;
}

export function FilterSaveToggleButton({
  isActive,
  activeLabel = "Limpiar filtros guardados",
  inactiveLabel = "Guardar configuración de filtros",
  activeTitle = "Limpiar filtros guardados",
  inactiveTitle = "Guardar filtros",
  className,
  ...props
}: FilterSaveToggleButtonProps) {
  const label = isActive ? activeLabel : inactiveLabel;
  const title = isActive ? activeTitle : inactiveTitle;
  const baseClass = isActive
    ? "border-rose-200 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/10 text-rose-600"
    : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10";
  return (
    <button
      type="button"
      aria-pressed={isActive}
      aria-label={label}
      title={title}
      className={`h-10 w-10 rounded-xl border cursor-pointer transition-colors inline-flex items-center justify-center ${baseClass} ${
        className || ""
      }`}
      {...props}
    >
      {isActive ? <HeartFilledIcon className="w-5 h-5" /> : <HeartIcon className="w-5 h-5" />}
    </button>
  );
}
