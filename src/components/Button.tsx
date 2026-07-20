"use client";

import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import { cloneElement, forwardRef, isValidElement } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "md" | "icon";
type ButtonRounded = "xl" | "full";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounded?: ButtonRounded;
  leftIcon?: ReactNode;
  /**
   * Aplica los estilos del botón sobre el ÚNICO hijo (fusionando su
   * `className`) en vez de renderizar un `<button>`. Útil cuando el elemento
   * debe seguir siendo otra etiqueta —p. ej. un `next/link` que necesita
   * conservar su navegación como `<a>`—. Ignora `leftIcon` (coloca el icono
   * dentro del hijo). Por defecto `false`: el render es idéntico al `<button>`
   * previo, de modo que los consumidores existentes no cambian.
   */
  asChild?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-sky-600 hover:bg-sky-700 text-white border border-sky-600 shadow-lg shadow-sky-500/30",
  secondary:
    "bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-sm",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white border border-rose-600 shadow-lg shadow-rose-500/30",
  ghost:
    "bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm font-semibold",
  icon: "p-2",
};

const roundedClasses: Record<ButtonRounded, string> = {
  xl: "rounded-xl",
  full: "rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "secondary",
    size = "md",
    rounded = "xl",
    leftIcon,
    asChild = false,
    className,
    children,
    type = "button",
    disabled,
    ...props
  },
  ref
) {
  const classes =
    `inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed ${roundedClasses[rounded]} ${sizeClasses[size]} ${variantClasses[variant]} ${className ?? ""}`.trim();

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<Record<string, unknown>>;
    const childClassName =
      typeof child.props.className === "string" ? child.props.className : "";
    // Reenvía al hijo TODAS las props del botón (onClick, aria-*, data-*, …) y
    // el `ref` del `forwardRef`, además de fusionar su `className` con el del
    // propio hijo (no lo sobrescribe). `type`/`disabled` son específicos de
    // `<button>`: `type` NO se reenvía (rompería un `<a>` y añadiría un atributo
    // que antes no existía); `disabled` solo si el consumidor lo pasó de forma
    // explícita, para no alterar el render de los hijos que no lo usan.
    //
    // Reenviar `ref` al hijo es exactamente el patrón `asChild`/Slot: se PASA el
    // ref (no se lee `.current` en render), pero el React Compiler no puede
    // distinguirlo; se silencia de forma acotada esta única línea.
    // eslint-disable-next-line react-hooks/refs
    return cloneElement(child, {
      ...props,
      ...(disabled !== undefined ? { disabled } : {}),
      ref,
      className: `${classes} ${childClassName}`.trim(),
    });
  }

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={classes}
      {...props}
    >
      {leftIcon}
      {children}
    </button>
  );
});
