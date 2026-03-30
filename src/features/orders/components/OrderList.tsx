"use client";

import { useMemo, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataTable, DataTableVisibleColumn } from "@/src/components/DataTable";
import { orderColumns } from "./OrderColumns";
import { useOrderCsvExport } from "../hooks/useOrderCsvExport";
import { useOrderPdfExport } from "../hooks/useOrderPdfExport";
import { Order } from "../interfaces/order.interface";
import { useOrderFilters } from "../hooks/useOrderFilters";
import { OrderFiltersValue, useOrderFiltersStore } from "../stores/order-filters.store";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { useOrders } from "../hooks/useOrders";

const OrderFiltersDialog = lazy(() =>
  import("./OrderFiltersDialog").then((mod) => ({ default: mod.OrderFiltersDialog }))
);

const parseOrderDate = (value: string) => {
  if (!value) return null;
  const trimmedValue = value.trim();
  const normalizedIsoValue = trimmedValue.includes(" ")
    ? trimmedValue.replace(" ", "T")
    : trimmedValue;
  const normalizedTimezoneValue = /[+-]\d{2}$/.test(normalizedIsoValue)
    ? `${normalizedIsoValue}:00`
    : normalizedIsoValue;
  const isoDate = new Date(normalizedTimezoneValue);
  if (!Number.isNaN(isoDate.getTime())) {
    return isoDate;
  }
  if (value.includes("/")) {
    const [day, month, year] = value.split("/").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value.includes("-")) {
    const [year, month, day] = value.split("-").map((part) => Number(part));
    if (!day || !month || !year) return null;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const OrderList = () => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const searchParams = useSearchParams();
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const filtersHydrated = useOrderFiltersStore((state) => state.hasHydrated);
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Order>[]>([]);
  const isOverdueActive = searchParams.get("overdue") === "1";
  const baseOrders = useMemo(() => {
    if (!isOverdueActive) {
      return orders;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return orders.filter((order) => {
      const dueDate = parseOrderDate(order.created_at ?? "");
      return dueDate ? dueDate < today : false;
    });
  }, [isOverdueActive, orders]);
  const {
    filters,
    filteredOrders,
    hasActiveFilters,
    applyFilters,
    clearFilters,
    savedFilters,
    saveFilters,
    clearSavedFilters,
    personaPagosOptions,
  } = useOrderFilters(baseOrders);

  useOrderCsvExport(visibleOrders, visibleColumns);
  useOrderPdfExport(visibleOrders, visibleColumns);
  const handleApplyFilters = (value: OrderFiltersValue) => {
    applyFilters(value);
    setIsFiltersOpen(false);
  };
  const handleClearFilters = () => {
    clearFilters();
  };

  if (isOrdersLoading || !filtersHydrated) {
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
        baseDataCount={baseOrders.length}
        title={isOverdueActive ? "Vencidos" : ""}
        searchPlaceholder="Buscar pedido..."
        onFiltersClick={() => setIsFiltersOpen(true)}
        isFiltersActive={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onVisibleRowsChange={setVisibleOrders}
        onVisibleColumnsChange={setVisibleColumns}
        actionButton={
          <div className="flex items-center gap-2">
            <Link
              href="/sales/orders/new"
              aria-label="Crear Nuevo Pedido"
              className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              + Nuevo Pedido
            </Link>
          </div>
        }
      />
      <Suspense fallback={null}>
        {isFiltersOpen && (
          <OrderFiltersDialog
            open={isFiltersOpen}
            onOpenChange={setIsFiltersOpen}
            value={filters}
            onApply={handleApplyFilters}
            onSave={saveFilters}
            onClearSaved={clearSavedFilters}
            savedValue={savedFilters}
            personaPagosOptions={personaPagosOptions}
          />
        )}
      </Suspense>
    </div>
  );
};
