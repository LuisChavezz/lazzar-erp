"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";
type ButtonSize = "md" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 hover:bg-sky-700 text-white border border-sky-600 shadow-lg shadow-sky-500/30",
  secondary:
    "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-lg shadow-rose-500/30",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm font-semibold rounded-xl",
  icon: "p-2 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    leftIcon,
    className,
    children,
    type = "button",
    disabled,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ""}`}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
});
