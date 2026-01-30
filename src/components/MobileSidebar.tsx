"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { CloseIcon, LogoIcon, MenuIcon } from "./Icons";
import { sidebarItems } from "../constants/sidebarItems";
import SidebarItem from "./SidebarItem";

export default function MobileSidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <>
      {/* MOBILE HEADER (Visible only on mobile) */}
      <header className="md:hidden fixed top-0 left-0 w-full h-16 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-3">
          <LogoIcon width="28" height="28" className="text-sky-600 dark:text-sky-400" />
          <span className="brand-font font-bold text-lg text-slate-900 dark:text-white">
            ERP
          </span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-slate-600 dark:text-slate-300"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
      </header>

      {/* MOBILE DRAWER */}
      <div
        className={`fixed inset-0 z-60 transform transition-transform duration-300 md:hidden ${
          isMobileOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Overlay */}
        <div
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
              onClick={() => setIsMobileOpen(false)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {sidebarItems.map((section, index) => (
              <div key={index}>
                {section.title && (
                  <div className={`px-4 mb-2 ${index === 0 ? "mt-2" : "mt-4"}`}>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                      {section.title}
                    </span>
                  </div>
                )}
                {section.items.map((item, itemIndex) => (
                  <SidebarItem
                    key={itemIndex}
                    item={item}
                    variant="mobile"
                    setIsMobileOpen={setIsMobileOpen}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
            <Link
              href="#"
              className="block w-full text-center px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold text-sm mb-3"
              onClick={() => setIsMobileOpen(false)}
            >
              Configuración
            </Link>
            <button 
              onClick={() => signOut({ callbackUrl: "/auth/login" })}
              className="block w-full text-center px-4 py-3 rounded-xl bg-black dark:bg-white text-white dark:text-black font-bold text-sm shadow-lg"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
