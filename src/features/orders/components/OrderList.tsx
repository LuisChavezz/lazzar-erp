"use client";

import { useMemo, useState, lazy, Suspense } from "react";
import Link from "next/link";
import { useIsMutating } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable, DataTableVisibleColumn } from "@/src/components/DataTable";
import { orderColumns } from "./OrderColumns";
import { useOrderCsvExport } from "../hooks/useOrderCsvExport";
import { useOrderPdfExport } from "../hooks/useOrderPdfExport";
import { Order } from "../interfaces/order.interface";
import { useOrderFilters } from "../hooks/useOrderFilters";
import { OrderFiltersValue, useOrderFiltersStore } from "../stores/order-filters.store";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { useOrders } from "../hooks/useOrders";
import { approveOrderMutationKey } from "../../operations/hooks/useApproveOrder";
import { rejectOrderMutationKey } from "../../operations/hooks/useRejectOrder";
import { hasPermission } from "@/src/utils/permissions";

const OrderFiltersDialog = lazy(() =>
  import("./OrderFiltersDialog").then((mod) => ({ default: mod.OrderFiltersDialog }))
);

export const OrderList = () => {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const { data: session } = useSession();
  const { orders, isLoading: isOrdersLoading } = useOrders();
  const filtersHydrated = useOrderFiltersStore((state) => state.hasHydrated);
  const [visibleOrders, setVisibleOrders] = useState<Order[]>([]);
  const [visibleColumns, setVisibleColumns] = useState<DataTableVisibleColumn<Order>[]>([]);
  const isAuthorizingOrder = useIsMutating({ mutationKey: approveOrderMutationKey }) > 0;
  const isRejectingOrder = useIsMutating({ mutationKey: rejectOrderMutationKey }) > 0;
  const isUpdatingOrderStatus = isAuthorizingOrder || isRejectingOrder;
  const canCreateOrder = hasPermission("R-CRM", session?.user);
  const baseOrders = useMemo(() => orders, [orders]);
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
      <div className="mt-12" role="status" aria-live="polite" aria-label="Cargando cotizaciones">
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
        searchPlaceholder="Buscar cotización..."
        onFiltersClick={() => setIsFiltersOpen(true)}
        isFiltersActive={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onVisibleRowsChange={setVisibleOrders}
        onVisibleColumnsChange={setVisibleColumns}
        isLoadingOverlay={isUpdatingOrderStatus}
        loadingTitle={isRejectingOrder ? "Rechazando cotización" : "Autorizando cotización"}
        loadingMessage="Estamos actualizando el estado de la orden."
        actionButton={
          canCreateOrder ? (
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/sales/orders/new"
                aria-label="Crear Nuevo cotización"
                className="inline-flex items-center justify-center px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-sky-500/30 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 transition-all duration-200 ease-in-out"
              >
                + Nuevo cotización
              </Link>
            </div>
          ) : null
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
