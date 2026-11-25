"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { DataTable } from "@/src/components/DataTable";
import { ListTabs } from "@/src/components/ListTabs";
import { isClosedProductionOrderStatus } from "../constants/productionOrderStatus";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { canAccessRoute } from "@/src/utils/routeAccess";
import { isInitialLoadError } from "@/src/utils/isInitialLoadError";
import {
  getProductionOrderColumns,
  PRODUCTION_ORDER_HEADER_FILTERS,
} from "./ProductionOrderColumns";
import { withHeaderFilters } from "@/src/components/withHeaderFilters";
import { useProductionOrders } from "../hooks/useProductionOrders";
import { productionOrderKpisQueryKey } from "../hooks/useProductionOrderKpis";
import { ProductionOrderKpisSection } from "./ProductionOrderKpisSection";
import { ProductionOrderCriticalPathDialog } from "@/src/features/production-order-critical-path/components/ProductionOrderCriticalPathDialog";
import type { CriticalPathTarget } from "@/src/features/production-order-critical-path/interfaces/production-order-critical-path.interface";
import { productionOrderDetailPath } from "@/src/constants/workOrderRoutes";

/** Pre-órdenes: de ahí nace toda OP ("Crear OP"). */
const PRE_ORDERS_PATH = "/manufacturing/pre-orders";

/**
 * Lista principal de órdenes de producción.
 *
 * "Ver detalle" NAVEGA a `/manufacturing/production-orders/[id]`
 * (`ProductionOrderPageContent`) en vez de abrir un diálogo montado por fila —
 * mismo cambio ya hecho en bordado/reflejante/corte de manga.
 *
 * Sin alta manual: el backend la deshabilitó (`create` responde 405 y
 * `onboarding/` solo admite GET). Toda OP nace de una pre-orden lista con
 * "Crear OP", así que la barra solo lo indica.
 */
export function ProductionOrderList() {
  const router = useRouter();

  // El enlace a Pre-órdenes solo se ofrece si el usuario puede abrirla (misma
  // regla que el proxy); si no, queda el texto.
  const { data: session } = useSession();
  const canOpenPreOrders = canAccessRoute(PRE_ORDERS_PATH, session?.user);
  // OP cuya ruta crítica está abierta. Se guarda la FOTO (id, folio y estatus) de la
  // apertura y no se resuelve contra el listado: la ruta crítica no depende de
  // la fila, así que un refetch del listado no debe cerrar el diálogo.
  const [criticalPathTarget, setCriticalPathTarget] = useState<CriticalPathTarget | null>(null);
  const columns = useMemo(
    () =>
      getProductionOrderColumns(
        (id) => router.push(productionOrderDetailPath(id)),
        (row) => setCriticalPathTarget({ opId: row.op_id, folio: row.folio_op, estatusOp: row.estatus_op }),
      ),
    [router],
  );
  const { data, hasLoaded, isLoading, isError, error, refetch, isRefetching } =
    useProductionOrders();

  // Un refetch fallido transitorio no debe descartar la tabla ya cargada
  // (perdiendo orden/búsqueda/paginación); solo se trata como error "de
  // pantalla completa" si nunca cargó. Mismo patrón que `PurchaseOrderReceiptList`.
  const showError = isInitialLoadError(isError, hasLoaded);

  // "En curso" / "Terminadas" (completadas y canceladas), sin salir de la página.
  const [vista, setVista] = useState<"curso" | "terminadas">("curso");
  const all = data ?? [];
  const terminadas = all.filter((row) => isClosedProductionOrderStatus(row.estatus_op));
  const enCurso = all.filter((row) => !isClosedProductionOrderStatus(row.estatus_op));
  const rows = vista === "terminadas" ? terminadas : enCurso;

  // Los indicadores tienen consulta propia que ninguna mutación de OP
  // invalida: el refresco de la tabla los refresca también, para que tarjetas
  // y tabla no muestren cifras de momentos distintos.
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

      <div className="flex flex-col gap-3">
      <ListTabs
        ariaLabel="Vista de órdenes de producción"
        value={vista}
        onChange={setVista}
        isReady={hasLoaded}
        tabs={[
          { key: "curso", label: "En curso", count: enCurso.length },
          { key: "terminadas", label: "Terminadas", count: terminadas.length },
        ]}
      />
      <DataTable
        columns={withHeaderFilters(columns, rows, PRODUCTION_ORDER_HEADER_FILTERS)}
        data={rows}
        baseDataCount={rows.length}
        paginationResetKey={vista}
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Las OP se crean desde{" "}
            {canOpenPreOrders ? (
              <Link
                href={PRE_ORDERS_PATH}
                className="font-semibold text-sky-600 dark:text-sky-400 hover:underline"
              >
                Pre-órdenes
              </Link>
            ) : (
              "Pre-órdenes"
            )}{" "}
            → «Crear OP».
          </p>
        }
      />
      </div>

      {/* Montado solo mientras está abierto: cada apertura pide una lectura
          fresca de la ruta crítica. */}
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
