"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { Button } from "@/src/components/Button";
import { getProductionOrderColumns } from "./ProductionOrderColumns";
import { CreateProductionOrderDialog } from "./CreateProductionOrderDialog";
import { useProductionOrders } from "../hooks/useProductionOrders";

/** Lista principal de órdenes de producción */
export function ProductionOrderList() {
  const columns = useMemo(() => getProductionOrderColumns(), []);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { data, hasLoaded, isLoading, isError, error, refetch, isRefetching } =
    useProductionOrders();

  // Un refetch fallido transitorio no debe descartar la tabla ya cargada
  // (perdiendo orden/búsqueda/paginación); solo se trata como error "de
  // pantalla completa" si nunca cargó. Mismo patrón que `PurchaseOrderReceiptList`.
  const showError = isInitialLoadError(isError, hasLoaded);

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
        isLoading={isLoading}
        isError={showError}
        errorTitle="Error al cargar las órdenes de producción"
        errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
        loadingAriaLabel="Cargando órdenes de producción"
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
