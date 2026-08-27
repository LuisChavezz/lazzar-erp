"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { Button } from "@/src/components/Button";
import { getProductionOrderColumns } from "./ProductionOrderColumns";
import { CreateProductionOrderDialog } from "./CreateProductionOrderDialog";
import { useProductionOrders } from "../hooks/useProductionOrders";

/**
 * Lista principal de órdenes de producción.
 *
 * "Ver detalle" NAVEGA a `/manufacturing/production-orders/[id]`
 * (`ProductionOrderPageContent`) en vez de abrir un diálogo montado por fila —
 * mismo cambio ya hecho en bordado/reflejante/corte de manga. Sin diálogo de
 * detalle montado aquí: a diferencia de esos tres módulos, el alta de esta
 * orden (`CreateProductionOrderDialog`/`ProductionOrderStepManager`) no tiene
 * un flujo de 409 de duplicado que necesite reabrir una orden existente por id,
 * así que no hay razón para mantenerlo vivo en el padre.
 */
export function ProductionOrderList() {
  const router = useRouter();

  // Ver el listado exige `R-PRODUCCION-OP` (ver `routePermissions`); dar de alta
  // exige además `C-PRODUCCION-OP`. `hasPermission` ya cortocircuita para el rol
  // "admin".
  const { data: session } = useSession();
  const canCreate = hasPermission("C-PRODUCCION-OP", session?.user);
  const columns = useMemo(
    () =>
      getProductionOrderColumns((id) =>
        router.push(`/manufacturing/production-orders/${id}`),
      ),
    [router],
  );
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
          canCreate ? (
            <Button
              variant="primary"
              rounded="full"
              onClick={() => setIsCreateOpen(true)}
              className="hover:scale-105 active:scale-95"
            >
              + Nueva Orden
            </Button>
          ) : undefined
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
