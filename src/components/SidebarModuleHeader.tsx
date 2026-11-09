"use client";

import type { ComponentType, SVGProps } from "react";
import Link from "next/link";
import SidebarItemSkeleton from "./SidebarItemSkeleton";
import { useSidebar } from "./SidebarProvider";

interface SidebarModuleHeaderProps {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * Destino de entrada al módulo (`getModuleEntryHref`, EC-813). `null` si el
   * usuario no puede abrir ninguna pantalla del módulo: se pinta como texto,
   * nunca como enlace a una ruta que el proxy rebotaría al Home.
   */
  href: string | null;
  /** La sesión carga o se está recuperando: skeleton. */
  isPending: boolean;
  /** Estamos en la portada del módulo. */
  isActive: boolean;
  variant: "desktop" | "mobile";
  /** Móvil: cierra el cajón al navegar. */
  onNavigate?: () => void;
}

/**
 * Cabecera del módulo activo en el sidebar (escritorio y móvil): skeleton
 * mientras se resuelve la sesión, enlace al destino de entrada o, sin destino,
 * texto no interactivo.
 */
export default function SidebarModuleHeader({
  label,
  icon: Icon,
  href,
  isPending,
  isActive,
  variant,
  onNavigate,
}: SidebarModuleHeaderProps) {
  const { isPinned } = useSidebar();

  if (isPending) {
    return <SidebarItemSkeleton variant={variant} />;
  }

  const isDesktop = variant === "desktop";
  const boxClass = isDesktop
    ? "flex items-center gap-4 px-3 py-3 rounded-xl relative"
    : "flex items-center gap-4 px-4 py-3 rounded-xl";
  const labelClass = isDesktop
    ? `font-medium text-sm truncate right-3 ${
        isPinned
          ? "opacity-100 transition-opacity duration-200 absolute left-14"
          : "opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 absolute left-14"
      }`
    : "font-medium text-sm whitespace-nowrap";

  const content = (
    <>
      <Icon className="w-6 h-6 shrink-0" aria-hidden="true" />
      <span title={isDesktop ? label : undefined} className={labelClass}>
        {label}
      </span>
    </>
  );

  if (!href) {
    return <div className={`${boxClass} text-slate-500 dark:text-white`}>{content}</div>;
  }

  return (
    <Link
      href={href}
      aria-label={label}
      onClick={onNavigate}
      className={`${boxClass} transition-colors${isDesktop ? " group" : ""} ${
        isActive
          ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300"
          : "hover:bg-sky-50 dark:hover:bg-sky-500/10 text-slate-500 dark:text-white hover:text-sky-600 dark:hover:text-sky-300"
      }`}
    >
      {content}
    </Link>
  );
}
