"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { DataTable, DataTableVisibleColumn } from "@/src/components/DataTable";
import { orderColumns } from "./OrderColumns";
import { OrdersFiltersDialog } from "./OrdersFiltersDialog";
import { useOrderStore } from "../stores/order.store";
import { useOrdersCsvExport } from "../hooks/useOrdersCsvExport";
import { useOrdersPdfExport } from "../hooks/useOrdersPdfExport";
import { Order } from "../interfaces/order.interface";

export const OrderList = () => {
  const [quickFilter, setQuickFilter] = useState<"all" | "activos" | "vencidos">("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { orders } = useOrderStore((state) => state);
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Order>[]>([]);

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

  useOrdersCsvExport(visibleOrders, visibleColumns);
  useOrdersPdfExport(visibleOrders, visibleColumns);
  const hasActiveFilters = quickFilter !== "all";
  const handleApplyFilters = (value: "all" | "activos" | "vencidos") => {
    setQuickFilter(value);
    setIsFiltersOpen(false);
  };
  const handleClearFilters = () => {
    setQuickFilter("all");
  };

  return (
    <div className="mt-12">
      <DataTable
        columns={orderColumns}
        data={filteredOrders}
        baseDataCount={orders.length}
        title="Últimos Pedidos"
        searchPlaceholder="Buscar pedido..."
        onFiltersClick={() => setIsFiltersOpen(true)}
        isFiltersActive={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onVisibleRowsChange={setVisibleOrders}
        onVisibleColumnsChange={setVisibleColumns}
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/orders/new"
              className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              + Nuevo Pedido
            </Link>
          </div>
        }
      />
      <OrdersFiltersDialog
        open={isFiltersOpen}
        onOpenChange={setIsFiltersOpen}
        value={quickFilter}
        onApply={handleApplyFilters}
      />
    </div>
  );
};
