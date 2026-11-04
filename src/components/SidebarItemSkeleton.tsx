"use client";

import { LoadingSkeleton } from "./LoadingSkeleton";
import { useSidebar } from "./SidebarProvider";

interface SidebarItemSkeletonProps {
  variant?: "desktop" | "mobile";
}

/**
 * Hueco de un `SidebarItem` mientras la sesión carga (`useSession()` en
 * `loading`). Ocupa exactamente lo mismo que el enlace real —misma caja
 * `px-3 py-3` con un icono de 24 px en escritorio, `px-4 py-3` con una línea de
 * texto en móvil— para que el menú no salte al llegar la sesión. En escritorio
 * la barra de la etiqueta sigue la misma visibilidad que la etiqueta real
 * (siempre con el sidebar anclado; con hover si está colapsado).
 */
export default function SidebarItemSkeleton({ variant = "desktop" }: SidebarItemSkeletonProps) {
  const { isPinned } = useSidebar();

  if (variant === "mobile") {
    return (
      <div aria-hidden="true" className="px-4 py-3">
        <div className="flex h-6 items-center">
          <LoadingSkeleton className="h-4 w-2/3! rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div aria-hidden="true" className="relative flex items-center gap-4 px-3 py-3">
      <LoadingSkeleton className="h-6 w-6! shrink-0 rounded-lg" />
      <span
        className={`absolute left-14 right-3 transition-opacity duration-200 ${isPinned ? "opacity-100" : "opacity-0 group-hover/sidebar:opacity-100"}`}
      >
        <LoadingSkeleton className="h-3 rounded-full" />
      </span>
    </div>
  );
}
