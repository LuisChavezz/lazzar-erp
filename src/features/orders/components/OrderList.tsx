"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { CloseIcon } from "@/src/components/Icons";
import { DataTable } from "@/src/components/DataTable";
import { orderColumns } from "./OrderColumns";
import { useOrderStore } from "../stores/order.store";

export const OrderList = () => {
  const [quickFilter, setQuickFilter] = useState<"all" | "activos" | "vencidos">("all");
  const { orders } = useOrderStore((state) => state);

  const filteredOrders = useMemo(() => {
    if (quickFilter === "activos") {
      return orders.filter(
        (o) => o.estatusPedido === "capturado" || o.estatusPedido === "autorizado" || o.estatusPedido === "surtido"
      );
    }
    if (quickFilter === "vencidos") {
      return orders.filter((o) => o.estatusPedido === "cancelado" || o.estatusPedido === "facturado");
    }
    return orders;
  }, [quickFilter, orders]);

  return (
    <div className="mt-12">
      <DataTable
        columns={orderColumns}
        data={filteredOrders}
        title="Últimos Pedidos"
        searchPlaceholder="Buscar pedido..."
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/orders/new"
              className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              + Nuevo Pedido
            </Link>
            <button
              onClick={() => setQuickFilter("activos")}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                quickFilter === "activos"
                  ? "bg-sky-100 dark:bg-sky-500/20 border-sky-300 dark:border-sky-500 text-sky-800 dark:text-sky-200 cursor-pointer"
                  : "bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
              }`}
            >
              Ver Activos
            </button>
            <button
              onClick={() => setQuickFilter("vencidos")}
              className={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                quickFilter === "vencidos"
                  ? "bg-rose-100 dark:bg-rose-500/20 border-rose-300 dark:border-rose-500 text-rose-800 dark:text-rose-100 cursor-pointer"
                  : "bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 cursor-pointer"
              }`}
            >
              Ver Vencidos
            </button>
            {quickFilter !== "all" && (
              <button
                onClick={() => setQuickFilter("all")}
                className="inline-flex items-center justify-center w-7 h-7 rounded-full border bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border-slate-200 dark:border-white/20 text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100 cursor-pointer"
                aria-label="Limpiar filtros rápidos"
              >
                <CloseIcon className="w-3 h-3" />
              </button>
            )}
          </div>
        }
      />
    </div>
  );
};
