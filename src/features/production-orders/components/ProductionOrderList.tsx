"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { hasPermission } from "@/src/utils/permissions";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import { Button } from "@/src/components/Button";
import { getProductionOrderColumns } from "./ProductionOrderColumns";
import { CreateProductionOrderDialog } from "./CreateProductionOrderDialog";
import { useProductionOrders } from "../hooks/useProductionOrders";
import { productionOrderKpisQueryKey } from "../hooks/useProductionOrderKpis";
import { ProductionOrderKpisSection } from "./ProductionOrderKpisSection";
import { ProductionOrderCriticalPathDialog } from "@/src/features/production-order-critical-path/components/ProductionOrderCriticalPathDialog";
import type { CriticalPathTarget } from "@/src/features/production-order-critical-path/interfaces/production-order-critical-path.interface";

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
  // OP cuya ruta crítica está abierta. Se guarda la FOTO (id + folio) de la
  // apertura y no se resuelve contra el listado: la ruta crítica no depende de
  // la fila, así que un refetch del listado no debe cerrar el diálogo.
  const [criticalPathTarget, setCriticalPathTarget] = useState<CriticalPathTarget | null>(null);
  const columns = useMemo(
    () =>
      getProductionOrderColumns(
        (id) => router.push(`/manufacturing/production-orders/${id}`),
        (row) => setCriticalPathTarget({ opId: row.op_id, folio: row.folio_op }),
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

  // Los indicadores tienen consulta propia que ninguna mutación de OP
  // invalida: el refresco de la tabla y el alta los refrescan también, para
  // que tarjetas y tabla no muestren cifras de momentos distintos. Aquí y no
  // en `useCreateProductionOrder`, que no sabe de esta pantalla.
  const queryClient = useQueryClient();
  const invalidateKpis = () =>
    queryClient.invalidateQueries({ queryKey: productionOrderKpisQueryKey });

  return (
    <div className="space-y-6">
      {/* Indicadores con consulta PROPIA (no se derivan del listado): cargan y
          fallan dentro de la sección, así que la tabla y su toolbar no
          dependen de ellos. Sin gate de permiso: la ruta ya exige
          `R-PRODUCCION-OP` (`routePermissions`), igual que `EmbroideryStats`. */}
      <ProductionOrderKpisSection />

      <DataTable
        columns={columns}
        data={data ?? []}
        baseDataCount={data?.length ?? 0}
        searchPlaceholder="Buscar..."
        isLoadingOverlay={isRefetching}
        onRefetch={() => Promise.all([refetch(), invalidateKpis()])}
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
        onSuccess={() => {
          void invalidateKpis();
          setIsCreateOpen(false);
        }}
      />

      {/* Montado solo mientras está abierto: el GET de la ruta crítica CREA
          el registro, y cada apertura pide una lectura fresca. */}
      {criticalPathTarget && (
        <ProductionOrderCriticalPathDialog
          key={criticalPathTarget.opId}
          target={criticalPathTarget}
          onClose={() => setCriticalPathTarget(null)}
        />
      )}
    </div>
  );
}
