"use client";

import { useState, useMemo } from "react";
import { CloseIcon } from "@/src/components/Icons";
import { Order } from "../../dashboard/interfaces/order.interface";
import { DataTable } from "@/src/components/DataTable";
import { orderColumns } from "./OrderColumns";

const orders: Order[] = [
  {
    id: "1",
    status: "Completado",
    folio: "#ORD-7829",
    client: {
      name: "Acme Corp",
      initials: "AC",
      colorClass: "bg-sky-100 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400",
    },
    pieces: 500,
    seller: "Juan Pérez",
    date: "12 Ene 2026",
    classification: "A",
    amount: "$10,732.76",
    partiality: "1/1",
    deliveryDate: "25 Ene 2026",
    newDate: "-",
    zip: "12345",
  },
  {
    id: "2",
    status: "En Proceso",
    folio: "#ORD-7830",
    client: {
      name: "Global Logistics",
      initials: "GL",
      colorClass: "bg-pink-100 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400",
    },
    pieces: 1200,
    seller: "Ana García",
    date: "14 Ene 2026",
    classification: "B",
    amount: "$38,965.52",
    partiality: "1/2",
    deliveryDate: "01 Feb 2026",
    newDate: "-",
    zip: "54321",
  },
  {
    id: "3",
    status: "Pendiente Pago",
    folio: "#ORD-7831",
    client: {
      name: "Tech Industries",
      initials: "TI",
      colorClass: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    },
    pieces: 150,
    seller: "Carlos López",
    date: "15 Ene 2026",
    classification: "C",
    amount: "$7,672.41",
    partiality: "1/1",
    deliveryDate: "15 Ene 2026",
    newDate: "-",
    zip: "67890",
  },
  {
    id: "4",
    status: "Retrasado",
    folio: "#ORD-7832",
    client: {
      name: "Star Traders",
      initials: "ST",
      colorClass: "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
    pieces: 300,
    seller: "Sofía Ruiz",
    date: "16 Ene 2026",
    classification: "A",
    amount: "$27,715.52",
    partiality: "2/3",
    deliveryDate: "28 Ene 2026",
    newDate: "30 Ene 2026",
    zip: "98765",
  },
];

export const OrderList = () => {
  const [quickFilter, setQuickFilter] = useState<"all" | "activos" | "vencidos">("all");

  const filteredOrders = useMemo(() => {
    if (quickFilter === "activos") {
      return orders.filter((o) => o.status === "En Proceso" || o.status === "Pendiente Pago");
    }
    if (quickFilter === "vencidos") {
      return orders.filter((o) => o.status === "Retrasado");
    }
    return orders;
  }, [quickFilter]);

  return (
    <div className="mt-12">
      <DataTable
        columns={orderColumns}
        data={filteredOrders}
        title="Últimos Pedidos"
        searchPlaceholder="Buscar pedido..."
        actionButton={
          <div className="flex items-center gap-2">
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
