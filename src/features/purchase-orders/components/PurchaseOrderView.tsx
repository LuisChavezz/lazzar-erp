"use client";

import { memo, useMemo, useState } from "react";
import {
  ComprasIcon,
  ClockIcon,
  CheckCircleIcon,
  ErrorIcon,
} from "@/src/components/Icons";
import KpiGrid, { type KpiItem } from "@/src/components/KpiGrid";
import { DataTable } from "@/src/components/DataTable";
import { extractErrorMessage } from "@/src/utils/extractErrorMessage";
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";
import { getColumns } from "./PurchaseOrderColumns";
import { createPurchaseOrdersFilterConfig } from "./PurchaseOrdersFilter";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { PurchaseOrderOnboardingStepManager } from "./PurchaseOrderOnboardingStepManager";
import {
  isPurchaseOrderAuthorizedOrComplete,
  isPurchaseOrderCancelled,
  isPurchaseOrderPending,
} from "../constants/purchaseOrderStatus";

// ─── KPIs ────────────────────────────────────────────────────────────────────

const OrderStats = memo(function OrderStats({ items }: { items: PurchaseOrder[] }) {
  const total = items.length;

  const pendientes = useMemo(
    () => items.filter((o) => isPurchaseOrderPending(o.estatus)).length,
    [items],
  );

  const autorizadas = useMemo(
    () => items.filter((o) => isPurchaseOrderAuthorizedOrComplete(o.estatus)).length,
    [items],
  );

  const canceladas = useMemo(
    () => items.filter((o) => isPurchaseOrderCancelled(o.estatus)).length,
    [items],
  );

  const kpis = useMemo<KpiItem[]>(
    () => [
      {
        label: "Total Órdenes",
        value: String(total),
        icon: ComprasIcon,
        iconBgClass: "bg-sky-50 dark:bg-sky-500/10",
        iconClass: "text-sky-500",
        trendLabel: "Activas",
        status: "neutral",
      },
      {
        label: "Pendientes",
        value: String(pendientes),
        icon: ClockIcon,
        iconBgClass: "bg-amber-50 dark:bg-amber-500/10",
        iconClass: "text-amber-500",
        trendLabel: "Por autorizar",
        status: "neutral",
      },
      {
        label: "Autorizadas",
        value: String(autorizadas),
        icon: CheckCircleIcon,
        iconBgClass: "bg-emerald-50 dark:bg-emerald-500/10",
        iconClass: "text-emerald-500",
        trendLabel: "Completadas o en curso",
        status: "positive",
      },
      {
        label: "Canceladas",
        value: String(canceladas),
        icon: ErrorIcon,
        iconBgClass: "bg-red-50 dark:bg-red-500/10",
        iconClass: "text-red-500",
        trendLabel: "Este período",
        status: "negative",
      },
    ],
    [total, pendientes, autorizadas, canceladas],
  );

  return <KpiGrid items={kpis} />;
});

// ─── Vista principal ─────────────────────────────────────────────────────────

export function PurchaseOrderView() {
  const {
    purchaseOrders = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = usePurchaseOrders();

  const columns = useMemo(() => getColumns(), []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // ── Sort by creation date descending ────────────────────────────────────
  const sortedOrders = useMemo(
    () =>
      [...purchaseOrders].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [purchaseOrders],
  );

  // ── Configuración de filtros para DataTable ─────────────────────────────
  const purchaseOrdersFilterConfig = useMemo(
    () => createPurchaseOrdersFilterConfig(purchaseOrders),
    [purchaseOrders],
  );

  // ── Tabla de órdenes ──────────────────────────────────────────────────────
  // `DataTable` se monta SIEMPRE (recibe `isLoading`/`isError` y alterna solo
  // su cuerpo), así que su toolbar y `actionButton` ("Nueva Orden") siguen
  // disponibles durante la carga o un error. Mismo patrón que
  // `AccountsReceivableList`.
  const table = (
    <DataTable
      columns={columns}
      data={sortedOrders}
      searchPlaceholder="Buscar orden, folio o referencia..."
      actionButton={
        <MainDialog
          title={
            <DialogHeader
              title="Nueva Orden de Compra"
              subtitle="Registro Nuevo"
              statusColor="sky"
            />
          }
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          maxWidth="640px"
          showCloseButton={false}
          trigger={
            <Button
              variant="primary"
              rounded="full"
              onClick={() => setIsDialogOpen(true)}
            >
              + Nueva Orden
            </Button>
          }
        >
          <PurchaseOrderOnboardingStepManager
            onClose={() => setIsDialogOpen(false)}
          />
        </MainDialog>
      }
      filterConfig={purchaseOrdersFilterConfig}
      onRefetch={refetch}
      isRefetching={isFetching}
      isLoading={isLoading}
      isError={isError}
      errorTitle="Error al cargar órdenes de compra"
      errorMessage={extractErrorMessage(error, "No se pudo cargar la información.")}
      loadingAriaLabel="Cargando órdenes de compra"
    />
  );

  // Un único `return`: la tabla se monta SIEMPRE (maneja carga/error en su
  // cuerpo, conservando su toolbar); los KPIs se ocultan durante la carga
  // INICIAL (`isLoading`) y ante un error de carga (`isError`) —no hay datos
  // que resumir—. `purchaseOrders` arranca en `[]`, así que sin este gate los
  // KPIs mostrarían ceros ("Total Órdenes: 0", etc.). En un refetch en segundo
  // plano (`isFetching`, con datos en caché) `isLoading`/`isError` son false y
  // los KPIs siguen visibles con los datos previos.
  return (
    <div className="space-y-6">
      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      {!isLoading && !isError && <OrderStats items={sortedOrders} />}

      {/* ── Tabla de órdenes ──────────────────────────────────────────────── */}
      {table}
    </div>
  );
}
