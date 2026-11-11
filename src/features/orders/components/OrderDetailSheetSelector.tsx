"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HistoryIcon, PedidosIcon, TrendingUpIcon } from "@/src/components/Icons";
import type { OrderDetailSheet } from "../constants/orderDetailSheets";

const SHEET_LABELS: Record<OrderDetailSheet, { label: string; icon: ReactNode }> = {
  order: { label: "Pedido", icon: <PedidosIcon className="w-4 h-4" aria-hidden="true" /> },
  progress: { label: "Avances", icon: <TrendingUpIcon className="w-4 h-4" aria-hidden="true" /> },
  history: { label: "Historial", icon: <HistoryIcon className="w-4 h-4" aria-hidden="true" /> },
};

interface OrderDetailSheetSelectorProps {
  sheets: readonly OrderDetailSheet[];
  active: OrderDetailSheet;
  /** `href` que abre la hoja conservando el resto de la query (`from`, etc.). */
  hrefFor: (sheet: OrderDetailSheet) => string;
}

/**
 * Selector de hoja del detalle de pedido: una píldora segmentada con un ENLACE
 * real por hoja (la hoja vive en `?sheet=`), así que se puede abrir en otra
 * pestaña y "atrás" del navegador vuelve a la hoja anterior. Recibe solo las
 * hojas que el usuario puede ver (`availableOrderDetailSheets`).
 */
export function OrderDetailSheetSelector({ sheets, active, hrefFor }: OrderDetailSheetSelectorProps) {
  return (
    <nav
      aria-label="Hojas del pedido"
      className="inline-flex rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-1"
    >
      {sheets.map((sheet) => {
        const isActive = sheet === active;
        return (
          <Link
            key={sheet}
            href={hrefFor(sheet)}
            aria-current={isActive ? "page" : undefined}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              isActive
                ? "bg-white dark:bg-zinc-800 text-sky-700 dark:text-sky-300 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {SHEET_LABELS[sheet].icon}
            {SHEET_LABELS[sheet].label}
          </Link>
        );
      })}
    </nav>
  );
}
