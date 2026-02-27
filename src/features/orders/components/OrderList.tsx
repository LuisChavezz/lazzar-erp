"use client";

import { useState } from "react";
import Link from "next/link";
import { DataTable, DataTableVisibleColumn } from "@/src/components/DataTable";
import { orderColumns } from "./OrderColumns";
import { OrdersFiltersDialog } from "./OrdersFiltersDialog";
import { useOrderStore } from "../stores/order.store";
import { useOrderCsvExport } from "../hooks/useOrderCsvExport";
import { useOrderPdfExport } from "../hooks/useOrderPdfExport";
import { Order } from "../interfaces/order.interface";
import { useOrderFilters } from "../hooks/useOrderFilters";
import { OrdersFiltersValue, useOrderFiltersStore } from "../stores/order-filters.store";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";

export const OrderList = () => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { orders } = useOrderStore((state) => state);
  const ordersHydrated = useOrderStore((state) => state.hasHydrated);
  const filtersHydrated = useOrderFiltersStore((state) => state.hasHydrated);
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Order>[]>([]);
  const {
    filters,
    filteredOrders,
    hasActiveFilters,
    applyFilters,
    clearFilters,
    savedFilters,
    saveFilters,
    clearSavedFilters,
  } = useOrderFilters(orders);

  useOrderCsvExport(visibleOrders, visibleColumns);
  useOrderPdfExport(visibleOrders, visibleColumns);
  const handleApplyFilters = (value: OrdersFiltersValue) => {
    applyFilters(value);
    setIsFiltersOpen(false);
  };
  const handleClearFilters = () => {
    clearFilters();
  };

  if (!ordersHydrated || !filtersHydrated) {
    return (
      <div className="mt-12" role="status" aria-live="polite" aria-label="Cargando pedidos">
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="mt-12">
      <DataTable
        columns={orderColumns}
        data={filteredOrders}
        baseDataCount={orders.length}
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
        value={filters}
        onApply={handleApplyFilters}
        onSave={saveFilters}
        onClearSaved={clearSavedFilters}
        savedValue={savedFilters}
      />
    </div>
  );
};
