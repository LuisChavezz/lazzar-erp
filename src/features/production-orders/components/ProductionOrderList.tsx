"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { LoadingSkeleton } from "@/src/components/LoadingSkeleton";
import { getProductionOrderColumns } from "./ProductionOrderColumns";
import { CreateProductionOrderDialog } from "./CreateProductionOrderDialog";
import { useProductionOrders } from "../hooks/useProductionOrders";

/** Lista principal de órdenes de producción */
export function ProductionOrderList() {
  const columns = useMemo(() => getProductionOrderColumns(), []);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, isLoading, refetch, isRefetching } = useProductionOrders();

  if (isLoading) {
    return (
      <div
        className="min-h-165"
        role="status"
        aria-live="polite"
        aria-label="Cargando órdenes de producción"
      >
        <LoadingSkeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <DataTable
        columns={columns}
        data={data ?? []}
        baseDataCount={data?.length ?? 0}
        searchPlaceholder="Buscar..."
        isLoadingOverlay={isRefetching}
        onRefetch={refetch}
        isRefetching={isRefetching}
        actionButton={
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-full shadow-lg shadow-sky-500/30 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
          >
            + Nueva Orden
          </button>
        }
      />

      <CreateProductionOrderDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => setIsCreateOpen(false)}
      />
    </div>
  );
}
