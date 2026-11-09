"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import MobileSidebar from "./MobileSidebar";
import SidebarItem from "./SidebarItem";
import SidebarItemSkeleton from "./SidebarItemSkeleton";
import SidebarModuleItems from "./SidebarModuleItems";
import SidebarModuleHeader from "./SidebarModuleHeader";
import SidebarSessionNotice from "./SidebarSessionNotice";
import { LogoIcon, PanelLeftCloseIcon, PanelLeftOpenIcon } from "./Icons";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { mainGroupKeys } from "@/src/constants/sidebarItems";
import { useSidebarSections } from "@/src/hooks/useSidebarSections";
import { getModuleEntryHref } from "@/src/utils/moduleEntry";
import type { SidebarEntry } from "@/src/utils/getSidebarItems";
import { useSidebar } from "./SidebarProvider";

export default function Sidebar() {
  const pathname = usePathname();
  const { isPinned, togglePin } = useSidebar();
  // Estado de la sesión y secciones (carga, recuperación, aviso): ver
  // `useSidebarSections`, compartido con `MobileSidebar`.
  const {
    sections: availableSections,
    user,
    isPending,
    isUnavailable,
    retry,
  } = useSidebarSections(pathname);
  const renderItem = (item: SidebarEntry) =>
    item.isPlaceholder ? (
      <SidebarItemSkeleton variant="desktop" />
    ) : (
      <SidebarItem item={item} variant="desktop" />
    );
  const activeGroup = appRouteGroups.find(
    (group) => pathname === group.modulePath || pathname.startsWith(`${group.modulePath}/`)
  );
  const moduleLabel =
    activeGroup && mainGroupKeys.has(activeGroup.key) ? activeGroup.moduleLabel : null;
  // Cabecera del módulo activo. Lleva al mismo destino que el resto de entradas
  // (`getModuleEntryHref`, EC-813): la portada exige el código de módulo y
  // quien solo tiene una sección sería rebotado al Home. `href` es `null`
  // mientras carga la sesión (skeleton) o si no hay destino abrible (sin enlace).
  const moduleItem =
    activeGroup && mainGroupKeys.has(activeGroup.key)
      ? {
        label: activeGroup.moduleLabel,
        href: isPending ? null : getModuleEntryHref(activeGroup, user),
        icon: activeGroup.moduleIcon,
        isActive: pathname === activeGroup.modulePath,
      }
      : null;

  // ─── Clases dependientes del estado de anclaje ──────────────────────────────

  // Ancho del panel interior y del aside
  const panelWidthClass = isPinned ? "w-72" : "w-20 group-hover/sidebar:w-72";

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
            <nav
              aria-busy={isPending}
              className="flex-1 overflow-y-auto no-scrollbar py-6 px-3 space-y-3"
            >
              {isUnavailable && <SidebarSessionNotice onRetry={retry} variant="desktop" />}
              {availableSections.map((section, index) => (
                <div key={index} className={index > 0 ? "mt-6" : ""}>
                  {index > 0 && <div className="h-px bg-slate-200/80 dark:bg-white/10 mx-2 my-2" />}
                  {index === 0 && moduleItem ? (
                    <div className="space-y-2">
                      <div>
                        {renderItem(section.items[0])}
                        <div className="h-px bg-slate-200/80 dark:bg-white/10 mx-2 my-2" />
                      </div>
                      <div className="space-y-2">
                        <SidebarModuleHeader
                          label={moduleItem.label}
                          icon={moduleItem.icon}
                          href={moduleItem.href}
                          isPending={isPending}
                          isActive={moduleItem.isActive}
                          variant="desktop"
                        />
                        <div className={sectionLabelClass}>
                          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {moduleLabel}
                          </span>
                        </div>
                        <div className={subItemIndentClass}>
                          {activeGroup?.sections ? (
                            <SidebarModuleItems group={activeGroup} variant="desktop" />
                          ) : (
                            section.items
                              .slice(1)
                              .filter((item) => item.href !== activeGroup?.modulePath)
                              .map((item, itemIndex) => (
                                <Fragment key={itemIndex}>{renderItem(item)}</Fragment>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <div key={itemIndex}>
                          {renderItem(item)}
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
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <MobileSidebar />
    </>
  );
}
