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
import { MainDialog } from "@/src/components/MainDialog";
import { DialogHeader } from "@/src/components/DialogHeader";
import { Button } from "@/src/components/Button";
import { usePurchaseOrders } from "../hooks/usePurchaseOrders";
import { getColumns } from "./PurchaseOrderColumns";
// import { purchaseOrdersFilterConfig } from "./PurchaseOrdersFilter";
import type { PurchaseOrder } from "../interfaces/purchase-order.interface";
import { PurchaseOrderOnboardingStepManager } from "./PurchaseOrderOnboardingStepManager";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isPending(status: number): boolean {
  return status === 2;
}

function isAuthorizedOrComplete(status: number): boolean {
  return [3, 4].includes(status);
}

function isCancelled(status: number): boolean {
  return status === 5;
}

// ─── KPIs ────────────────────────────────────────────────────────────────────

const OrderStats = memo(function OrderStats({ items }: { items: PurchaseOrder[] }) {
  const total = items.length;

  const pendientes = useMemo(
    () => items.filter((o) => isPending(o.estatus)).length,
    [items],
  );

  const autorizadas = useMemo(
    () => items.filter((o) => isAuthorizedOrComplete(o.estatus)).length,
    [items],
  );

  const canceladas = useMemo(
    () => items.filter((o) => isCancelled(o.estatus)).length,
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

  // ── Estados de carga y error ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600" />
        <span className="ml-3 text-sm text-slate-500">
          Cargando órdenes de compra...
        </span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-6 text-center">
        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
          Error al cargar órdenes de compra
        </p>
        <p className="text-xs text-red-500 dark:text-red-300 mt-1">
          {(error as Error).message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <OrderStats items={sortedOrders} />

      {/* ── Tabla de órdenes ──────────────────────────────────────────────── */}
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
        // filterConfig={purchaseOrdersFilterConfig}
        onRefetch={refetch}
        isRefetching={isFetching}
      />
    </div>
  );
}
