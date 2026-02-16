"use client";

import { useLogout } from "../features/auth/hooks/useLogout";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import MobileSidebar from "./MobileSidebar";
import { sidebarItems } from "../constants/sidebarItems";
import SidebarItem from "./SidebarItem";
import { ConfirmDialog } from "./ConfirmDialog";
import { LogoIcon, LogoutIcon, SettingsIcon } from "./Icons";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { handleLogout } = useLogout();
  const isConfigActive = pathname === "/config" || pathname.startsWith("/config/");
  const isAdmin = session?.user?.role === "admin";

  return (
    <>
      {/* SIDEBAR (Desktop) */}
      <aside className="hidden md:flex flex-col h-full z-40 relative w-20 hover:w-72 group/sidebar bg-white/80 dark:bg-black/60 backdrop-blur-2xl border-r border-slate-200 dark:border-white/5 transition-all duration-300 ease-in-out shadow-2xl">
        {/* Logo Section */}
        <div className="h-20 flex items-center px-6 shrink-0 overflow-hidden relative border-b border-slate-100 dark:border-slate-800/50">
          <div className="flex items-center gap-4 min-w-max">
            <Link href="#" aria-label="Ir al inicio" className="shrink-0 text-sky-600 dark:text-sky-400">
              <LogoIcon width="32" height="32" className="fill-current opacity-80" aria-hidden="true" />
            </Link>
            <span className="brand-font font-bold text-xl tracking-tight opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100 whitespace-nowrap">
              ERP System
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto no-scrollbar py-6 px-3 space-y-1">
          {sidebarItems.map((section, index) => (
            <div key={index} className={index > 0 ? "mt-6" : ""}>
              {section.title && (
                <div className="px-3 mb-2 opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-300 delay-100">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                    {section.title}
                  </span>
                </div>
              )}
              {section.items.map((item, itemIndex) => (
                <SidebarItem
                  key={itemIndex}
                  item={item}
                  variant="desktop"
                />
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">

          {/* Configuración */}
          {isAdmin && (
            <Link
              href="/config"
              aria-label="Configuración"
              className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-colors group relative ${
                isConfigActive
                  ? "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300"
                  : "hover:bg-sky-50 dark:hover:bg-sky-500/10 text-slate-500 dark:text-white hover:text-sky-600 dark:hover:text-sky-300"
              }`}
            >
              <SettingsIcon className="w-6 h-6 shrink-0" aria-hidden="true" />
              <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 absolute left-14">
                Configuración
              </span>
            </Link>
          )}

          {/* Cerrar sesión */}
          <ConfirmDialog
            title="Cerrar sesión"
            description="¿Estás seguro de que deseas cerrar sesión?"
            onConfirm={handleLogout}
            confirmText="Cerrar sesión"
            trigger={
              <button 
                type="button"
                aria-label="Cerrar sesión"
                className="w-full mt-2 flex items-center justify-start gap-4 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors group relative overflow-hidden"
              >
                <LogoutIcon className="w-6 h-6 shrink-0" aria-hidden="true" />
                <span className="font-medium text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-200 absolute left-14">
                  Cerrar sesión
                </span>
              </button>
            }
          />
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <MobileSidebar />
    </>
  );
}
