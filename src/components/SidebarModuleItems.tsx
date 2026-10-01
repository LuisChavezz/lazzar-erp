"use client";

import { useSession } from "next-auth/react";
import SidebarItem from "./SidebarItem";
import { useSidebar } from "./SidebarProvider";
import type { AppRouteGroup } from "@/src/constants/appRoutes";
import { getVisibleRouteSections } from "@/src/utils/routeSections";

interface SidebarModuleItemsProps {
  /** Grupo activo; debe declarar `sections` (los grupos planos los pinta el sidebar como siempre). */
  group: AppRouteGroup;
  variant?: "desktop" | "mobile";
  setIsMobileOpen?: (isOpen: boolean) => void;
}

/**
 * Hojas del módulo activo agrupadas por sub-grupo, dentro del sidebar
 * (escritorio y móvil). Solo para grupos con `sections`: cada sub-grupo visible lleva un encabezado fijo (siempre expandido, sin estado
 * propio). En el modo colapsado de escritorio (solo iconos) el encabezado se
 * oculta con el mismo `opacity-0` / hover que las demás etiquetas y en su lugar
 * queda una línea fina entre bloques de iconos. La fila del encabezado ocupa
 * la misma altura en ambos modos para que los iconos no salten al expandir.
 */
export default function SidebarModuleItems({
  group,
  variant = "desktop",
  setIsMobileOpen,
}: SidebarModuleItemsProps) {
  const { data: session } = useSession();
  const { isPinned } = useSidebar();
  const sections = getVisibleRouteSections(group, session?.user);

  if (!sections) {
    return null;
  }

  const headerLabelClass = isPinned
    ? "opacity-100"
    : "opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200";
  const separatorClass = isPinned
    ? "hidden"
    : "opacity-100 group-hover/sidebar:opacity-0 transition-opacity duration-200";

  return (
    <>
      {sections.map((section, sectionIndex) => (
        <div key={section.key} role="group" aria-label={section.label} className="space-y-2">
          {variant === "mobile" ? (
            <div className={`px-4 ${sectionIndex > 0 ? "pt-2" : ""}`}>
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                {section.label}
              </span>
            </div>
          ) : (
            <div className={`relative flex h-5 items-center ${sectionIndex > 0 ? "mt-3" : ""}`}>
              {sectionIndex > 0 && (
                <div
                  aria-hidden="true"
                  className={`absolute inset-x-2 top-1/2 h-px bg-slate-200/80 dark:bg-white/10 ${separatorClass}`}
                />
              )}
              <span
                className={`px-3 text-xs font-semibold whitespace-nowrap text-slate-400 dark:text-slate-500 ${headerLabelClass}`}
              >
                {section.label}
              </span>
            </div>
          )}
          {section.items.map((item) => (
            <SidebarItem
              key={item.path}
              item={{
                label: item.label,
                href: item.path,
                icon: item.icon,
                permission: item.permission,
              }}
              variant={variant}
              setIsMobileOpen={setIsMobileOpen}
            />
          ))}
        </div>
      ))}
    </>
  );
}
