"use client";

import { Fragment, useState } from "react";
import { usePathname } from "next/navigation";
import { CloseIcon, LogoIcon, MenuIcon } from "./Icons";
import SidebarItem from "./SidebarItem";
import SidebarItemSkeleton from "./SidebarItemSkeleton";
import SidebarModuleItems from "./SidebarModuleItems";
import SidebarModuleHeader from "./SidebarModuleHeader";
import SidebarSessionNotice from "./SidebarSessionNotice";
import { Notifications } from "../features/notifications/components/Notifications";
import { UserMenu } from "./UserMenu";
import { appRouteGroups } from "@/src/constants/appRoutes";
import { mainGroupKeys } from "@/src/constants/sidebarItems";
import { useSidebarSections } from "@/src/hooks/useSidebarSections";
import { getModuleEntryHref } from "@/src/utils/moduleEntry";
import type { SidebarEntry } from "@/src/utils/getSidebarItems";

export default function MobileSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  // Mismo estado y secciones que `Sidebar` (ver `useSidebarSections`).
  const {
    sections: availableSections,
    user,
    isPending,
    isUnavailable,
    retry,
  } = useSidebarSections(pathname);
  const renderItem = (item: SidebarEntry) =>
    item.isPlaceholder ? (
      <SidebarItemSkeleton variant="mobile" />
    ) : (
      <SidebarItem item={item} variant="mobile" setIsMobileOpen={setIsMobileOpen} />
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

  return (
    <>
      {/* MOBILE HEADER (Visible only on mobile) */}
      <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <LogoIcon width="28" height="28" className="text-sky-600 dark:text-sky-400" />
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Notifications />

          {/* Menú de usuario (incluye "Cerrar sesión") */}
          <UserMenu />

          {/* Menu Button */}
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-600 dark:text-slate-300"
          >
            <MenuIcon className="w-6 h-6" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-60 transform transition-transform duration-300 md:hidden ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Overlay */}
        <div
          aria-hidden="true"
          role="presentation"
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setIsMobileOpen(false)}
        ></div>

        {/* Drawer Content */}
        <div className="absolute right-0 top-0 h-full w-[80%] max-w-sm bg-white dark:bg-zinc-900 shadow-2xl flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
            <span className="brand-font font-bold text-lg">Menú</span>
            <button
              type="button"
              aria-label="Cerrar menú"
              onClick={() => setIsMobileOpen(false)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <CloseIcon className="w-6 h-6" aria-hidden="true" />
            </button>
          </div>
          <div aria-busy={isPending} className="flex-1 overflow-y-auto p-4 space-y-3">
            {isUnavailable && <SidebarSessionNotice onRetry={retry} variant="mobile" />}
            {availableSections.map((section, index) => (
              <div key={index}>
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
                        variant="mobile"
                        onNavigate={() => setIsMobileOpen(false)}
                      />
                      <div className="px-4">
                        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                          {moduleLabel}
                        </span>
                      </div>
                      <div className="ml-4 pl-3 border-l border-slate-200/70 dark:border-white/10 space-y-2">
                        {activeGroup?.sections ? (
                          <SidebarModuleItems
                            group={activeGroup}
                            variant="mobile"
                            setIsMobileOpen={setIsMobileOpen}
                          />
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
          </div>
        </div>
      </div>
    </>
  );
}
