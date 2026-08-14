"use client";

import { useLogout } from "../features/auth/hooks/useLogout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import MobileSidebar from "./MobileSidebar";
import { getSidebarItems } from "@/src/utils/getSidebarItems";
import SidebarItem from "./SidebarItem";
import { ConfirmDialog } from "./ConfirmDialog";
import { LogoIcon, LogoutIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "./Icons";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { useSidebar } from "./SidebarProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const { handleLogout, isPending: isLoggingOut } = useLogout();
  const { data: session } = useSession();
  const { isPinned, togglePin } = useSidebar();
  const availableSections = getSidebarItems(session?.user, pathname);
  const activeGroup = appRouteGroups.find(
    (group) => pathname === group.modulePath || pathname.startsWith(`${group.modulePath}/`)
  );
  const mainGroupKeys = new Set([
    "system",
    "sales",
    "wms",
    "procurement",
    "manufacturing",
    "finance",
    "hr",
    "operations",
  ]);
  const moduleLabel =
    activeGroup && mainGroupKeys.has(activeGroup.key) ? activeGroup.moduleLabel : null;
  const moduleItem =
    activeGroup && mainGroupKeys.has(activeGroup.key)
      ? {
        label: activeGroup.moduleLabel,
        href: activeGroup.modulePath,
        icon: activeGroup.moduleIcon,
      }
      : null;

  // ─── Clases dependientes del estado de anclaje ──────────────────────────────

  // Ancho del panel interior y del aside
  const panelWidthClass = isPinned ? "w-72" : "w-20 group-hover/sidebar:w-72";

  // Visibilidad de etiquetas de texto (nombre de marca, labels de items)
  const labelClass = isPinned
    ? "opacity-100 transition-opacity duration-200 absolute left-14"
    : "opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 absolute left-14";

  // Visibilidad del nombre de marca en la sección del logo
  const brandLabelClass = isPinned
    ? "opacity-100 transition-opacity duration-300 whitespace-nowrap"
    : "opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap";

  // Visibilidad del label de sección de módulo
  const sectionLabelClass = isPinned
    ? "px-3 opacity-100 transition-opacity duration-200"
    : "px-3 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200";

  // Indentación de sub-items del módulo activo
  const subItemIndentClass = isPinned
    ? "ml-4 pl-3 border-l border-slate-200/70 dark:border-white/10 space-y-2"
    : "ml-0 pl-0 border-l-0 group-hover/sidebar:ml-4 group-hover/sidebar:pl-3 group-hover/sidebar:border-l group-hover/sidebar:border-slate-200/70 dark:group-hover/sidebar:border-white/10 space-y-2";

  // Visibilidad del botón de anclaje (solo visible cuando el sidebar está expandido)
  const pinBtnClass = isPinned
    ? "opacity-100 text-sky-500 hover:text-sky-600"
    : "opacity-0 group-hover/sidebar:opacity-100 text-slate-400 hover:text-sky-600 transition-opacity duration-200";

  return (
    <>
      {/* SIDEBAR (Desktop) */}
      <aside className={`relative z-40 hidden h-full shrink-0 overflow-visible md:flex transition-[width] duration-300 ease-in-out ${isPinned ? "w-72" : "w-20"}`}>
        <div className={`${isPinned ? "" : "group/sidebar"} relative h-full w-20 shrink-0`}>
          <div className={`absolute inset-y-0 left-0 flex h-full flex-col overflow-hidden bg-white/80 backdrop-blur-2xl border-r border-slate-200 shadow-2xl transition-[width] duration-300 ease-in-out dark:bg-black/60 dark:border-white/5 ${panelWidthClass}`}>
            {/* Sección del logo y botón de anclaje */}
            <div className="h-20 flex items-center px-6 shrink-0 overflow-hidden relative border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-4 min-w-max flex-1">
                <Link href="#" aria-label="Ir al inicio" className="shrink-0 text-sky-600 dark:text-sky-400">
                  <LogoIcon width="32" height="32" className="fill-current opacity-80" aria-hidden="true" />
                </Link>
                <span className={`brand-font font-bold text-xl tracking-tight ${brandLabelClass}`}>
                  ERP System
                </span>
                <button
                  type="button"
                  aria-label={isPinned ? "Desanclar barra lateral" : "Anclar barra lateral"}
                  aria-pressed={isPinned}
                  onClick={togglePin}
                  title={isPinned ? "Desanclar" : "Anclar barra lateral"}
                  className={`ml-auto shrink-0 p-1 rounded-lg transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${pinBtnClass}`}
                >
                  {isPinned
                    ? <PanelLeftCloseIcon className="w-5 h-5" aria-hidden="true" />
                    : <PanelLeftOpenIcon className="w-5 h-5" aria-hidden="true" />
                  }
                </button>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto no-scrollbar py-6 px-3 space-y-3">
              {availableSections.map((section, index) => (
                <div key={index} className={index > 0 ? "mt-6" : ""}>
                  {index > 0 && <div className="h-px bg-slate-200/80 dark:bg-white/10 mx-2 my-2" />}
                  {index === 0 && moduleItem ? (
                    <div className="space-y-2">
                      <div>
                        <SidebarItem item={section.items[0]} variant="desktop" />
                        <div className="h-px bg-slate-200/80 dark:bg-white/10 mx-2 my-2" />
                      </div>
                      <div className="space-y-2">
                        <Link
                          href={moduleItem.href}
                          aria-label={moduleItem.label}
                          className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors group relative ${pathname === moduleItem.href
                              ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300"
                              : "hover:bg-sky-50 dark:hover:bg-sky-500/10 text-slate-500 dark:text-white hover:text-sky-600 dark:hover:text-sky-300"
                            }`}
                        >
                          <moduleItem.icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                          <span title={moduleItem.label} className={`font-medium text-sm truncate right-3 ${labelClass}`}>
                            {moduleItem.label}
                          </span>
                        </Link>
                        <div className={sectionLabelClass}>
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {moduleLabel}
                          </span>
                        </div>
                        <div className={subItemIndentClass}>
                          {section.items
                            .slice(1)
                            .filter((item) => item.href !== moduleItem.href)
                            .map((item, itemIndex) => (
                              <SidebarItem key={itemIndex} item={item} variant="desktop" />
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex}>
                          <SidebarItem item={item} variant="desktop" />
                          {index === 0 && itemIndex === 0 && (
                            <div className="h-px bg-slate-200/80 dark:bg-white/10 mx-2 my-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <ConfirmDialog
                title="Cerrar sesión"
                description="¿Estás seguro de que deseas cerrar sesión?"
                onConfirm={handleLogout}
                confirmText="Cerrar sesión"
                trigger={
                  <button
                    type="button"
                    aria-label="Cerrar sesión"
                    disabled={isLoggingOut}
                    className="w-full mt-2 flex items-center justify-start gap-4 px-3 py-3 rounded-xl cursor-pointer text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group relative overflow-hidden disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <LogoutIcon className="w-6 h-6 shrink-0" aria-hidden="true" />
                    <span className={`font-medium text-sm whitespace-nowrap ${labelClass}`}>
                      {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
                    </span>
                  </button>
                }
              />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <MobileSidebar />
    </>
  );
}
