"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { Button } from "@/src/components/Button";
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
          <Button
            variant="primary"
            rounded="full"
            onClick={() => setIsCreateOpen(true)}
            className="hover:scale-105 active:scale-95"
          >
            + Nueva Orden
          </Button>
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
