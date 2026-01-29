"use client";

import { useState, useRef, useEffect } from "react";
import { BellIcon, ErrorIcon, CheckCircleIcon, InfoIcon } from "./Icons";

export const Notifications = () => {
  const [isNotifOpen, setIsNotifOpen] = useState(false); // State to track if notifications dropdown is open
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref to notifications dropdown element
  const btnRef = useRef<HTMLButtonElement>(null); // Ref to notifications button element

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    };

    // Add event listener when component mounts
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setIsNotifOpen(!isNotifOpen)}
        className="p-2 text-slate-400 hover:text-sky-600 transition relative outline-none cursor-pointer"
      >
        <BellIcon className="w-5 h-5" />
        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-50 dark:border-black animate-pulse"></span>
      </button>

      {/* Notifications Dropdown */}
      {isNotifOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 mt-4 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden transform origin-top-right transition-all duration-200"
        >
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
            <h3 className="font-bold text-slate-800 dark:text-white">
              Notificaciones
            </h3>
            <span className="text-xs font-medium text-sky-500 cursor-pointer hover:underline">
              Marcar leídas
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto custom-scrollbar">

            {/* Error Notification */}
            <div className="p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3 relative group">
              <div className="shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-500 dark:bg-red-500/20 flex items-center justify-center">
                <ErrorIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Error de Sincronización
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  No se pudo conectar con el servidor de pagos. Reintenta en
                  unos minutos.
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block">
                  Hace 5 min
                </span>
              </div>
              <div className="absolute right-2 top-2 w-2 h-2 bg-red-500 rounded-full"></div>
            </div>

            {/* Success Notification */}
            <div className="p-4 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 text-emerald-500 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircleIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Pedido Completado
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  La orden{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    #ORD-7829
                  </span>{" "}
                  ha sido entregada exitosamente.
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block">
                  Hace 2 horas
                </span>
              </div>
            </div>

            {/* Info Notification */}
            <div className="p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-sky-100 text-sky-500 dark:bg-sky-500/20 flex items-center justify-center">
                <InfoIcon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">
                  Actualización de Sistema
                </p>
                <p className="text-xs text-slate-500 mt-1 leading-snug">
                  Versión 2.1 disponible con nuevas funciones de reportes.
                </p>
                <span className="text-[10px] text-slate-400 mt-2 block">
                  Ayer
                </span>
              </div>
            </div>
          </div>
          <div className="p-3 text-center border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-black/20">
            <a
              href="#"
              className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400 transition-colors"
            >
              Ver todas las notificaciones
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
